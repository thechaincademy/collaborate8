// Google Play Real-time developer notifications via Pub/Sub push (OIDC-authenticated).
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import {
  fetchGoogleSubscription, findStoreRow, GOOGLE_SECRETS, googleServiceAccount, missingSecrets,
  profileExists, saveStoreRow, StoreHttpError, tokenRef,
} from "../_shared/store-subscription-rule.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const log = (m: string, d?: Record<string, unknown>) => console.log(`[GOOGLE-PLAY-RTDN] ${m}${d ? " " + JSON.stringify(d) : ""}`);
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));
const DEFAULT_AUD = "https://eycpkzbjylzzynkfggis.supabase.co/functions/v1/google-play-rtdn";

const TYPES: Record<number, string> = {
  1: "SUBSCRIPTION_RECOVERED", 2: "SUBSCRIPTION_RENEWED", 3: "SUBSCRIPTION_CANCELED", 4: "SUBSCRIPTION_PURCHASED",
  5: "SUBSCRIPTION_ON_HOLD", 6: "SUBSCRIPTION_IN_GRACE_PERIOD", 7: "SUBSCRIPTION_RESTARTED",
  8: "SUBSCRIPTION_PRICE_CHANGE_CONFIRMED", 9: "SUBSCRIPTION_DEFERRED", 10: "SUBSCRIPTION_PAUSED",
  11: "SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED", 12: "SUBSCRIPTION_REVOKED", 13: "SUBSCRIPTION_EXPIRED",
  17: "SUBSCRIPTION_ITEMS_CHANGED", 18: "SUBSCRIPTION_CANCELLATION_SCHEDULED",
  19: "SUBSCRIPTION_PRICE_CHANGE_UPDATED", 20: "SUBSCRIPTION_PENDING_PURCHASE_CANCELED",
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const auth = req.headers.get("Authorization") ?? "";
  if (!auth.startsWith("Bearer ") || auth.length < 20) return json({ error: "Unauthorized" }, 401);

  const missing = missingSecrets(GOOGLE_SECRETS);
  if (missing.length) { log("store not configured", { missing }); return json({ error: "store_not_configured", store: "google" }, 503); }

  let expectedEmail = Deno.env.get("GOOGLE_PLAY_RTDN_PUSH_SA_EMAIL");
  try { expectedEmail ||= googleServiceAccount().client_email; } catch {
    log("store not configured", { missing: ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON (invalid)"] });
    return json({ error: "store_not_configured", store: "google" }, 503);
  }
  try {
    const { payload } = await jwtVerify(auth.slice(7), JWKS, {
      issuer: ["accounts.google.com", "https://accounts.google.com"],
      audience: Deno.env.get("GOOGLE_PLAY_RTDN_AUDIENCE") || DEFAULT_AUD,
      algorithms: ["RS256"],
    });
    if (payload.email_verified !== true || String(payload.email ?? "").toLowerCase() !== String(expectedEmail).toLowerCase()) throw new Error("email");
  } catch {
    log("invalid push token");
    return json({ error: "Unauthorized" }, 401);
  }

  let msg: any;
  try {
    const body = await req.json();
    msg = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(body.message.data), (c) => c.charCodeAt(0))));
  } catch { log("bad message"); return json({ ok: true, ignored: "bad_message" }); }

  const pkg = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")!;
  if (msg.packageName !== pkg) { log("package mismatch"); return json({ ok: true, ignored: "package" }); }
  if (msg.testNotification) { log("test notification"); return json({ ok: true }); }

  const admin = createSupabaseAdmin();
  try {
    if (msg.voidedPurchaseNotification) {
      const token = String(msg.voidedPurchaseNotification.purchaseToken ?? "");
      const row = token ? await findStoreRow(admin, "google", token) : null;
      if (row) await saveStoreRow(admin, row, { ...row, status: "refunded", last_notification_type: "VOIDED_PURCHASE" } as any);
      log("voided", { userId: row?.user_id ?? null, token: token ? await tokenRef(token) : null });
      return json({ ok: true });
    }

    const sn = msg.subscriptionNotification;
    if (!sn?.purchaseToken) return json({ ok: true, ignored: "unsupported" });
    const token = String(sn.purchaseToken);
    const typeName = TYPES[Number(sn.notificationType)] ?? `SUBSCRIPTION_${sn.notificationType}`;
    const ref = await tokenRef(token);

    let g;
    try { g = await fetchGoogleSubscription(pkg, token); }
    catch (e) {
      if (e instanceof StoreHttpError && e.status === 422) { log("token not found", { token: ref, type: typeName }); return json({ ok: true, ignored: "not_found" }); }
      throw e;
    }

    const existing = await findStoreRow(admin, "google", token);
    let userId = existing?.user_id ?? null;
    if (!existing) {
      if (!(await profileExists(admin, g.obfuscatedAccountId))) {
        log("no matching row or account", { token: ref, type: typeName });
        return json({ ok: true, ignored: "unknown_subscription" });
      }
      userId = g.obfuscatedAccountId;
    }
    const status = typeName === "SUBSCRIPTION_REVOKED" ? "revoked" : g.row.status;
    await saveStoreRow(admin, existing, {
      ...(existing ?? {}), ...g.row, status, user_id: userId!,
      last_verified_at: new Date().toISOString(), last_notification_type: typeName,
    } as any);
    if (g.linkedPurchaseToken) {
      const old = await findStoreRow(admin, "google", g.linkedPurchaseToken);
      if (old && old.user_id === userId) await saveStoreRow(admin, old, { ...old, status: "expired" } as any);
    }
    log("processed", { userId, token: ref, type: typeName, status });
    return json({ ok: true });
  } catch (e) {
    log("error", { message: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
    return json({ error: "processing_failed" }, 500);
  }
});
