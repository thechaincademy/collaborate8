import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import {
  acknowledgeGoogle, APPLE_SECRETS, decodeJwsPayloadUnverified, fetchAppleSubscription,
  fetchGoogleSubscription, findStoreRow, GOOGLE_SECRETS, isStoreActive, isUniqueViolation,
  missingSecrets, productAllowed, saveStoreRow, storeAccessShape, StoreHttpError, StoreRow, tokenRef,
} from "../_shared/store-subscription-rule.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const fail = (status: number, error: string, extra: Record<string, unknown> = {}) =>
  json({ hasAccess: false, error, ...extra }, status);
const log = (m: string, d?: Record<string, unknown>) => console.log(`[VERIFY-STORE-PURCHASE] ${m}${d ? " " + JSON.stringify(d) : ""}`);

const optStr = (max: number) => z.string().max(max).nullish();
const Body = z.object({
  platform: z.enum(["ios", "android"]),
  product_id: z.string().min(1).max(200),
  transaction_id: optStr(100),
  original_transaction_id: optStr(100),
  purchase_token: optStr(4096),
  order_id: optStr(200),
  verification_data: optStr(200000),
  package_name: optStr(255),
  restored: z.boolean().nullish(),
});

const digits = (v: unknown) => (typeof v === "string" && /^\d{1,30}$/.test(v) ? v : null);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return fail(405, "method_not_allowed");

  let user;
  try { user = await getUserFromRequest(req); } catch { return fail(401, "Unauthorized"); }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return fail(400, "invalid_request", { detail: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  }
  const body = parsed.data;
  const store = body.platform === "ios" ? "apple" : "google";

  // Resolve the identifier before checking config, so bad bodies get 400.
  let appleTxId: string | null = null;
  let googleToken: string | null = null;
  if (store === "apple") {
    appleTxId = digits(body.transaction_id) ?? digits(body.original_transaction_id);
    if (!appleTxId && body.verification_data && body.verification_data.split(".").length === 3) {
      try { appleTxId = digits(String(decodeJwsPayloadUnverified(body.verification_data).transactionId ?? "")); } catch { /* ignore */ }
    }
    if (!appleTxId) return fail(400, "invalid_request", { detail: "transaction_id is required" });
  } else {
    googleToken = (body.purchase_token || body.verification_data || "").trim() || null;
    if (!googleToken || googleToken.length < 10) return fail(400, "invalid_request", { detail: "purchase_token is required" });
  }

  const missing = missingSecrets(store === "apple" ? APPLE_SECRETS : GOOGLE_SECRETS);
  if (missing.length) {
    log("store not configured", { store, missing });
    return fail(503, "store_not_configured", { store });
  }

  const admin = createSupabaseAdmin();
  try {
    let row: any;
    let identifier: string;
    let ref: Record<string, unknown>;
    let after: (() => Promise<void>) | null = null;

    if (store === "apple") {
      const a = await fetchAppleSubscription(appleTxId!);
      if (a.bundleId !== Deno.env.get("APPLE_BUNDLE_ID") || a.type !== "Auto-Renewable Subscription" || !productAllowed(a.row.product_id)) {
        log("product mismatch", { userId: user.id, originalTransactionId: a.row.original_transaction_id });
        return fail(422, "product_mismatch");
      }
      identifier = a.row.original_transaction_id;
      ref = { originalTransactionId: identifier };
      if (a.appAccountToken && a.appAccountToken.toLowerCase() !== user.id.toLowerCase()) {
        log("account mismatch", { userId: user.id, ...ref });
        return fail(403, "purchase_account_mismatch");
      }
      row = a.row;
    } else {
      const pkg = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")!;
      if (body.package_name && body.package_name !== pkg) return fail(400, "invalid_request", { detail: "package_name does not match" });
      const g = await fetchGoogleSubscription(pkg, googleToken!);
      identifier = googleToken!;
      ref = { token: await tokenRef(identifier) };
      if (!productAllowed(g.row.product_id)) { log("product mismatch", { userId: user.id, ...ref }); return fail(422, "product_mismatch"); }
      if (g.obfuscatedAccountId && g.obfuscatedAccountId.toLowerCase() !== user.id.toLowerCase()) {
        log("account mismatch", { userId: user.id, ...ref });
        return fail(403, "purchase_account_mismatch");
      }
      row = { ...g.row, latest_transaction_id: g.row.latest_transaction_id ?? body.order_id ?? null };
      after = async () => {
        if (g.needsAck && !(await acknowledgeGoogle(pkg, g.row.product_id, identifier))) log("acknowledge failed", { userId: user.id, ...ref });
        if (g.linkedPurchaseToken) {
          const old = await findStoreRow(admin, "google", g.linkedPurchaseToken);
          if (old && old.user_id === user.id) await saveStoreRow(admin, old, { ...old, status: "expired" } as any);
        }
      };
    }

    const payload = { ...row, user_id: user.id, last_verified_at: new Date().toISOString() };
    const upsert = async (): Promise<StoreRow | Response> => {
      const existing = await findStoreRow(admin, store, identifier);
      if (existing && existing.user_id !== user.id) {
        log("linked to other account", { userId: user.id, ...ref });
        return fail(409, "purchase_linked_to_other_account");
      }
      return saveStoreRow(admin, existing, payload);
    };
    let saved: StoreRow | Response;
    try { saved = await upsert(); } catch (e) {
      if (!isUniqueViolation(e)) throw e;
      saved = await upsert(); // insert raced with another request: re-read and update
    }
    if (saved instanceof Response) return saved;
    if (after) await after();

    const active = isStoreActive(saved);
    log("verified", { userId: user.id, store, status: saved.status, active, restored: !!body.restored, ...ref });
    if (!active) return json({ hasAccess: false, error: "not_active", status: saved.status, store });
    return json({
      hasAccess: true, access: storeAccessShape(saved), store, status: saved.status,
      product_id: saved.product_id, expires_at: saved.expires_at, auto_renew: saved.auto_renew, environment: saved.environment,
    });
  } catch (e) {
    if (e instanceof StoreHttpError) return fail(e.status, e.code);
    log("error", { userId: user.id, message: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
    return fail(502, "store_unavailable");
  }
});
