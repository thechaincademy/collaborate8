/**
 * Charge id of a paid Stripe invoice, for every API version we see.
 *
 * Before 2025-03-31.basil an invoice carried `charge` and `payment_intent` at the top level.
 * From basil on (we pin 2025-08-27.basil) both are gone: the payment lives in
 * `invoice.payments.data[].payment` ({ type: "payment_intent" | "charge", ... }), and
 * `payments` is only present when expanded. Webhook payloads do not expand it.
 *
 * No Stripe import here so it can be unit tested with a fake client.
 */
export interface ChargeLookupClient {
  invoices: { retrieve(id: string, params?: Record<string, unknown>): Promise<any> };
  paymentIntents: { retrieve(id: string, params?: Record<string, unknown>): Promise<any> };
}

const idOf = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === "string") return v;
  const id = (v as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
};

/** The invoice payment that actually paid: status "paid" first, then the default one, then the first. */
export function pickInvoicePayment(payments: any[] | null | undefined): any | null {
  const list = (payments ?? []).filter(Boolean);
  return list.find((p) => p.status === "paid") ?? list.find((p) => p.is_default) ?? list[0] ?? null;
}

/** Charge id readable from the payload alone (no API calls). */
export function chargeIdFromInvoicePayload(invoice: any): string | null {
  if (!invoice) return null;
  // Legacy (pre-basil) top-level fields.
  const legacy = idOf(invoice.charge);
  if (legacy) return legacy;
  if (invoice.payment_intent && typeof invoice.payment_intent === "object") {
    const c = idOf(invoice.payment_intent.latest_charge);
    if (c) return c;
  }
  // basil: invoice.payments (only when expanded).
  const p = pickInvoicePayment(invoice.payments?.data)?.payment;
  if (p) {
    const direct = idOf(p.charge);
    if (direct) return direct;
    if (p.payment_intent && typeof p.payment_intent === "object") {
      const c = idOf(p.payment_intent.latest_charge);
      if (c) return c;
    }
  }
  return null;
}

/**
 * Charge id for a paid invoice. Uses the payload when it has it, otherwise reads
 * invoice.payments (expanded) and the PaymentIntent's latest_charge. Never throws:
 * returns null if Stripe cannot tell us, so the payment row is still recorded.
 */
export async function resolveInvoiceChargeId(
  client: ChargeLookupClient,
  invoice: any,
  log: (step: string, details?: unknown) => void = () => {},
): Promise<string | null> {
  try {
    const fromPayload = chargeIdFromInvoicePayload(invoice);
    if (fromPayload) return fromPayload;

    // Legacy payload with a bare payment_intent id.
    let paymentIntentId = idOf(invoice?.payment_intent);

    if (!paymentIntentId) {
      let payments: any[] | undefined = invoice?.payments?.data;
      if (!payments && invoice?.id) {
        const full = await client.invoices.retrieve(invoice.id, { expand: ["payments"] });
        const fromFull = chargeIdFromInvoicePayload(full);
        if (fromFull) return fromFull;
        payments = full?.payments?.data ?? [];
      }
      paymentIntentId = idOf(pickInvoicePayment(payments)?.payment?.payment_intent);
    }

    if (!paymentIntentId) return null;
    const pi = await client.paymentIntents.retrieve(paymentIntentId);
    return idOf(pi?.latest_charge);
  } catch (e) {
    log("Could not resolve invoice charge id", { invoiceId: invoice?.id, error: String(e) });
    return null;
  }
}
