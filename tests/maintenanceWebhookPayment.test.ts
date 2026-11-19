import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const src = readFileSync(new URL("../supabase/functions/stripe-webhooks/index.ts", import.meta.url), "utf8");
const section = (from: string, to: string) => src.slice(src.indexOf(from), src.indexOf(to, src.indexOf(from)));

describe("First maintenance payment is recorded whichever webhook arrives first", () => {
  const helper = section("async function recordMaintenanceInvoicePayment(", "serve(async (req)");
  const invoiceCase = section('case "invoice.payment_succeeded"', '// ── Invoice payment failed ──');
  const checkoutCase = section('case "checkout.session.completed"', "default:");

  it("one shared helper writes the ledger row with the invoice idempotency key", () => {
    expect(helper).toContain('from("payments").insert(');
    expect(helper).toContain("const idempotencyKey = `inv_${invoice.id}`;");
    expect(helper).toContain('status: "completed"');
  });
  it("audit is written once, only when a payment row was added", () => expect(helper).toContain("if (recorded) await supabase"));
  it("invoice handler waits for the arrangement, then asks Stripe to retry for maintenance subscriptions", () => {
    expect(invoiceCase).toContain("for (let attempt = 0; attempt < 4; attempt++)");
    expect(invoiceCase).toContain('subMeta.collabor8_type === "maintenance"');
    expect(invoiceCase).toContain("status: 503");
    expect(invoiceCase).toContain("recordMaintenanceInvoicePayment(stripe, supabase, invoice, arrangement, subscriptionId)");
  });
  it("checkout completion records the already-paid first invoice after creating the arrangement", () => {
    const after = checkoutCase.slice(checkoutCase.indexOf("Arrangement created from hosted checkout"));
    expect(after).toContain("stripe.invoices.retrieve(latestInvoiceId)");
    expect(after).toContain('latestInvoice.status === "paid"');
    expect(after).toContain("recordMaintenanceInvoicePayment(stripe, supabase, latestInvoice, arrangement, subscriptionId)");
  });
  it("new API invoices still give the subscription id", () => {
    expect(src).toContain("invoice.parent?.subscription_details?.subscription");
  });
});
