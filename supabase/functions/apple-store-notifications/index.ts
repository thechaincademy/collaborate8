// App Store Server Notifications V2. Public endpoint; authenticity comes from the Apple-signed JWS.
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { findStoreRow, profileExists, saveStoreRow, StoreStatus, verifyAppleJws } from "../_shared/store-subscription-rule.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const log = (m: string, d?: Record<string, unknown>) => console.log(`[APPLE-STORE-NOTIFICATIONS] ${m}${d ? " " + JSON.stringify(d) : ""}`);
const ms = (v: unknown) => (v ? new Date(Number(v)).toISOString() : null);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const bundleId = Deno.env.get("APPLE_BUNDLE_ID");
  if (!bundleId) { log("store not configured", { missing: ["APPLE_BUNDLE_ID"] }); return json({ error: "store_not_configured", store: "apple" }, 503); }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.signedPayload !== "string") return json({ error: "Unauthorized" }, 401);

  let n: any, txn: any = null, renewal: any = null;
  try {
    n = await verifyAppleJws(body.signedPayload);
    if (n.data?.signedTransactionInfo) txn = await verifyAppleJws(n.data.signedTransactionInfo);
    if (n.data?.signedRenewalInfo) renewal = await verifyAppleJws(n.data.signedRenewalInfo);
  } catch {
    log("invalid signature");
    return json({ error: "Unauthorized" }, 401);
  }

  const type = String(n.notificationType ?? "");
  const subtype = n.subtype ? String(n.subtype) : null;
  if (type === "TEST") { log("test notification"); return json({ ok: true }); }
  if ((n.data?.bundleId ?? txn?.bundleId) !== bundleId) { log("bundle mismatch", { type }); return json({ ok: true, ignored: "bundle" }); }

  const otid = String(txn?.originalTransactionId ?? renewal?.originalTransactionId ?? "");
  if (!otid) { log("no transaction", { type }); return json({ ok: true, ignored: "no_transaction" }); }

  try {
    const admin = createSupabaseAdmin();
    let existing = await findStoreRow(admin, "apple", otid);
    let userId = existing?.user_id ?? null;
    if (!existing) {
      const token = txn?.appAccountToken ?? null;
      if (!(await profileExists(admin, token))) {
        log("no matching row or account", { originalTransactionId: otid, type });
        return json({ ok: true, ignored: "unknown_subscription" });
      }
      userId = token;
    }
    if (existing?.updated_at && n.signedDate && Number(n.signedDate) < new Date(existing.updated_at).getTime()) {
      log("stale notification ignored", { originalTransactionId: otid, type });
      return json({ ok: true, ignored: "stale" });
    }

    const expiry = ms(txn?.expiresDate) ?? existing?.expires_at ?? null;
    const unexpired = !!expiry && new Date(expiry).getTime() > Date.now();
    let status: StoreStatus = (existing?.status as StoreStatus) ?? "active";
    let expires_at = expiry;
    let auto_renew = renewal ? Number(renewal.autoRenewStatus) === 1 : existing?.auto_renew ?? null;

    switch (type) {
      case "SUBSCRIBED": case "DID_RENEW": case "OFFER_REDEEMED": case "RENEWAL_EXTENDED": case "DID_CHANGE_RENEWAL_PREF":
        status = "active"; break;
      case "DID_CHANGE_RENEWAL_STATUS":
        if (subtype === "AUTO_RENEW_DISABLED") { auto_renew = false; status = unexpired ? "cancelled" : "expired"; }
        else if (subtype === "AUTO_RENEW_ENABLED") { auto_renew = true; status = "active"; }
        break;
      case "DID_FAIL_TO_RENEW":
        if (subtype === "GRACE_PERIOD") { status = "grace_period"; expires_at = ms(renewal?.gracePeriodExpiresDate) ?? expiry; }
        else status = "billing_retry";
        break;
      case "EXPIRED": case "GRACE_PERIOD_EXPIRED": status = "expired"; break;
      case "REFUND": status = "refunded"; break;
      case "REVOKE": status = "revoked"; break;
      default: break;
    }

    await saveStoreRow(admin, existing, {
      ...(existing ?? {}),
      user_id: userId!,
      store: "apple",
      product_id: String(txn?.productId ?? existing?.product_id ?? ""),
      original_transaction_id: otid,
      latest_transaction_id: txn?.transactionId ? String(txn.transactionId) : existing?.latest_transaction_id ?? null,
      status, expires_at, auto_renew,
      environment: String(n.data?.environment ?? txn?.environment ?? "Production").toLowerCase() === "sandbox" ? "sandbox" : "production",
      last_notification_type: subtype ? `${type}:${subtype}` : type,
    } as any);
    log("processed", { userId, originalTransactionId: otid, type, status });
    return json({ ok: true });
  } catch (e) {
    log("error", { originalTransactionId: otid, type, message: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
    return json({ error: "processing_failed" }, 500);
  }
});
