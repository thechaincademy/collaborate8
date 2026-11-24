import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  chargeIdFromInvoicePayload,
  pickInvoicePayment,
  resolveInvoiceChargeId,
} from "../supabase/functions/_shared/stripe-charge.ts";

function fakeClient(opts: { invoice?: any; pi?: any; throwOn?: "invoice" | "pi" } = {}) {
  const calls: { invoices: any[]; pis: any[] } = { invoices: [], pis: [] };
  return {
    calls,
    invoices: {
      retrieve: async (id: string, params?: any) => {
        calls.invoices.push({ id, params });
        if (opts.throwOn === "invoice") throw new Error("boom");
        return opts.invoice ?? { id };
      },
    },
    paymentIntents: {
      retrieve: async (id: string) => {
        calls.pis.push(id);
        if (opts.throwOn === "pi") throw new Error("boom");
        return opts.pi ?? { id, latest_charge: null };
      },
    },
  };
}

// Shape of a basil invoice.payment_succeeded payload: no charge, no payment_intent, payments not expanded.
const basilPayload = { id: "in_1", object: "invoice", amount_paid: 50, status: "paid" };

describe("Invoice charge id (basil and legacy)", () => {
  it("legacy top-level charge string is used as is, no API calls", async () => {
    const c = fakeClient();
    expect(await resolveInvoiceChargeId(c, { id: "in_1", charge: "ch_legacy" })).toBe("ch_legacy");
    expect(c.calls.invoices.length + c.calls.pis.length).toBe(0);
  });
  it("legacy expanded charge object and expanded payment_intent.latest_charge", () => {
    expect(chargeIdFromInvoicePayload({ charge: { id: "ch_obj" } })).toBe("ch_obj");
    expect(chargeIdFromInvoicePayload({ payment_intent: { id: "pi_1", latest_charge: "ch_pi" } })).toBe("ch_pi");
  });
  it("legacy bare payment_intent id: reads the PaymentIntent's latest_charge", async () => {
    const c = fakeClient({ pi: { id: "pi_9", latest_charge: "ch_9" } });
    expect(await resolveInvoiceChargeId(c, { id: "in_1", payment_intent: "pi_9" })).toBe("ch_9");
    expect(c.calls.pis).toEqual(["pi_9"]);
    expect(c.calls.invoices.length).toBe(0);
  });
  it("basil payload: expands invoice.payments, then PaymentIntent latest_charge", async () => {
    const c = fakeClient({
      invoice: {
        id: "in_1",
        payments: { data: [{ status: "paid", payment: { type: "payment_intent", payment_intent: "pi_2" } }] },
      },
      pi: { id: "pi_2", latest_charge: "ch_2" },
    });
    expect(await resolveInvoiceChargeId(c, basilPayload)).toBe("ch_2");
    expect(c.calls.invoices).toEqual([{ id: "in_1", params: { expand: ["payments"] } }]);
    expect(c.calls.pis).toEqual(["pi_2"]);
  });
  it("basil payment of type charge: charge id straight from invoice.payments", async () => {
    const c = fakeClient({
      invoice: { id: "in_1", payments: { data: [{ status: "paid", payment: { type: "charge", charge: "ch_3" } }] } },
    });
    expect(await resolveInvoiceChargeId(c, basilPayload)).toBe("ch_3");
    expect(c.calls.pis.length).toBe(0);
  });
  it("already-expanded payments in the payload are used without refetching the invoice", async () => {
    const c = fakeClient({ pi: { id: "pi_4", latest_charge: { id: "ch_4" } } });
    const inv = { id: "in_1", payments: { data: [{ status: "paid", payment: { type: "payment_intent", payment_intent: "pi_4" } }] } };
    expect(await resolveInvoiceChargeId(c, inv)).toBe("ch_4");
    expect(c.calls.invoices.length).toBe(0);
  });
  it("picks the paid payment over an earlier failed/open one", () => {
    const p = pickInvoicePayment([
      { status: "canceled", payment: { charge: "ch_old" } },
      { status: "paid", payment: { charge: "ch_paid" } },
    ]);
    expect(p.payment.charge).toBe("ch_paid");
    expect(pickInvoicePayment(undefined)).toBeNull();
  });
  it("no payment on the invoice: null, no PaymentIntent call", async () => {
    const c = fakeClient({ invoice: { id: "in_1", payments: { data: [] } } });
    expect(await resolveInvoiceChargeId(c, basilPayload)).toBeNull();
    expect(c.calls.pis.length).toBe(0);
  });
  it("Stripe errors never throw: null so the payment row is still recorded", async () => {
    const logs: string[] = [];
    expect(await resolveInvoiceChargeId(fakeClient({ throwOn: "invoice" }), basilPayload, (s) => logs.push(s))).toBeNull();
    expect(logs.length).toBe(1);
  });
});

describe("stripe-webhooks uses the resolver and fills a missing charge id once", () => {
  const src = readFileSync(new URL("../supabase/functions/stripe-webhooks/index.ts", import.meta.url), "utf8");
  const helper = src.slice(src.indexOf("async function recordMaintenanceInvoicePayment("), src.indexOf("serve(async (req)"));
  it("no legacy invoice.charge read remains", () => {
    expect(src).not.toContain("invoice.charge");
    expect(src).not.toContain("extractChargeId");
  });
  it("ledger insert stores the resolved charge id", () => {
    expect(helper).toContain("const chargeId = await resolveInvoiceChargeId(stripe as any, invoice, logStep);");
    expect(helper).toContain("provider_charge_id: chargeId,");
  });
  it("existing row: charge id only filled when empty, never a second row", () => {
    expect(helper).toContain('.select("id, provider_charge_id")');
    expect(helper).toContain("!existingPayment.provider_charge_id && chargeId");
    expect(helper).toContain('.is("provider_charge_id", null)');
    // still exactly one insert, guarded by the idempotency lookup
    expect(helper.split('from("payments").insert(').length - 1).toBe(1);
    expect(helper).toContain("if (!existingPayment) {");
  });
  it("disputes still match on provider_charge_id", () => {
    expect(src).toContain('.eq("provider_charge_id", chargeId)');
  });
});

describe("subscription create no longer expands the removed invoice.payment_intent", () => {
  const adapter = readFileSync(new URL("../supabase/functions/_shared/stripe-adapter.ts", import.meta.url), "utf8");
  it("expand list", () => {
    expect(adapter).not.toContain('"latest_invoice.payment_intent"');
    expect(adapter).toContain('expand: ["latest_invoice"]');
  });
});
