import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { isActive } from "../_shared/conversation-tool-access-rule.ts";
import {
  acknowledgeGoogle, activeStoreSubscription, APPLE_SECRETS, decodeJwsPayloadUnverified,
  fetchAppleSubscription, fetchGoogleSubscription, findStoreRow, GOOGLE_SECRETS, missingSecrets,
  productAllowed, saveStoreRow, StoreHttpError, tokenRef,
} from "../_shared/store-subscription-rule.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const log = (m: string, d?: Record<string, unknown>) => console.log(`[VERIFY-STORE-PURCHASE] ${m}${d ? " " + JSON.stringify(d) : ""}`);

const Ios = z.object({
  platform: z.literal("ios"),
  productId: z.string().min(1).max(200),
  transactionId: z.string().regex(/^\d{1,30}$/).optional(),
  signedTransaction: z.string().min(10).max(20000).optional(),
}).refine((b) => b.transactionId || b.signedTransaction, { message: "transactionId or signedTransaction is required" });
const Android = z.object({
  platform: z.literal("android"),
  productId: z.string().min(1).max(200),
  purchaseToken: z.string().min(10).max(4096),
  packageName: z.string().min(1).max(255),
});
const Body = z.union([Ios, Android]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  let user;
  try { user = await getUserFromRequest(req); } catch { return json({ error: "Unauthorized" }, 401); }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: "invalid_request", detail: parsed.error.issues.map((i) => i.message).join("; ") }, 400);
  }
  const body = parsed.data;
  const store = body.platform === "ios" ? "apple" : "google";
  const missing = missingSecrets(store === "apple" ? APPLE_SECRETS : GOOGLE_SECRETS);
  if (missing.length) {
    log("store not configured", { store, missing });
    return json({ error: "store_not_configured", store }, 503);
  }

  const admin = createSupabaseAdmin();
  try {
    let row: any;
    let identifier: string;
    let after: (() => Promise<void>) | null = null;

    if (body.platform === "ios") {
      let txId = body.transactionId;
      if (!txId) {
        try { txId = String(decodeJwsPayloadUnverified(body.signedTransaction!).transactionId ?? ""); } catch { txId = ""; }
        if (!/^\d{1,30}$/.test(txId)) return json({ error: "invalid_request", detail: "signedTransaction has no transactionId" }, 400);
      }
      const a = await fetchAppleSubscription(txId);
      if (a.bundleId !== Deno.env.get("APPLE_BUNDLE_ID")) return json({ error: "product_mismatch" }, 422);
      if (a.type !== "Auto-Renewable Subscription") return json({ error: "product_mismatch" }, 422);
      if (a.row.product_id !== body.productId || !productAllowed(a.row.product_id)) return json({ error: "product_mismatch" }, 422);
      if (a.appAccountToken && a.appAccountToken.toLowerCase() !== user.id.toLowerCase()) {
        log("account mismatch", { userId: user.id, originalTransactionId: a.row.original_transaction_id });
        return json({ error: "purchase_account_mismatch" }, 403);
      }
      row = a.row; identifier = a.row.original_transaction_id;
    } else {
      const pkg = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME")!;
      if (body.packageName !== pkg) return json({ error: "invalid_request", detail: "packageName does not match" }, 400);
      const g = await fetchGoogleSubscription(pkg, body.purchaseToken);
      if (g.row.product_id !== body.productId || !productAllowed(g.row.product_id)) return json({ error: "product_mismatch" }, 422);
      if (g.obfuscatedAccountId && g.obfuscatedAccountId.toLowerCase() !== user.id.toLowerCase()) {
        log("account mismatch", { userId: user.id, token: await tokenRef(body.purchaseToken) });
        return json({ error: "purchase_account_mismatch" }, 403);
      }
      row = g.row; identifier = body.purchaseToken;
      after = async () => {
        if (g.needsAck && !(await acknowledgeGoogle(pkg, g.row.product_id, body.purchaseToken))) {
          log("acknowledge failed", { userId: user.id, token: await tokenRef(body.purchaseToken) });
        }
        if (g.linkedPurchaseToken) {
          const old = await findStoreRow(admin, "google", g.linkedPurchaseToken);
          if (old && old.user_id === user.id) await saveStoreRow(admin, old, { ...old, status: "expired" } as any);
        }
      };
    }

    const existing = await findStoreRow(admin, store, identifier);
    if (existing && existing.user_id !== user.id) {
      log("linked to other account", { userId: user.id, ...(store === "apple" ? { originalTransactionId: identifier } : { token: await tokenRef(identifier) }) });
      return json({ error: "purchase_linked_to_other_account" }, 409);
    }
    const saved = await saveStoreRow(admin, existing, { ...row, user_id: user.id, last_verified_at: new Date().toISOString() });
    if (after) await after();

    const { data: stripeRow, error } = await admin.from("conversation_tool_access")
      .select("source, expires_at, subscription_status, current_period_end").eq("user_id", user.id).maybeSingle();
    if (error) throw new Error("entitlement lookup failed");
    const premium = isActive(stripeRow) || !!(await activeStoreSubscription(admin, user.id));

    log("verified", { userId: user.id, store, status: saved.status, ...(store === "apple" ? { originalTransactionId: identifier } : { token: await tokenRef(identifier) }) });
    return json({
      premium, store, status: saved.status, product_id: saved.product_id,
      expires_at: saved.expires_at, auto_renew: saved.auto_renew, environment: saved.environment,
    });
  } catch (e) {
    if (e instanceof StoreHttpError) return json({ error: e.code }, e.status);
    log("error", { userId: user.id, message: e instanceof Error ? e.message.slice(0, 120) : "unknown" });
    return json({ error: "store_unavailable" }, 502);
  }
});
