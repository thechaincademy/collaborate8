// Apple App Store + Google Play subscription entitlement and verification.
// Deploy target: supabase/functions/_shared/store-subscription-rule.ts
// Never log secrets, JWS payloads, receipts or purchase tokens (use tokenRef()).
import { X509Certificate } from "npm:@peculiar/x509@1.12.3";

export type StoreStatus =
  | "active" | "grace_period" | "billing_retry" | "on_hold" | "paused"
  | "cancelled" | "expired" | "refunded" | "revoked" | "pending";

export const STORE_ACTIVE_STATUSES: StoreStatus[] = ["active", "grace_period", "cancelled"];
/** Empty = accept any subscription product of our own app; non-empty = enforce. */
export const STORE_PREMIUM_PRODUCT_IDS: string[] = ["c8_premium_monthly", "c8_premium_yearly"];

export interface StoreRow {
  id?: string; user_id?: string; store?: "apple" | "google"; product_id?: string;
  original_transaction_id?: string | null; purchase_token?: string | null;
  latest_transaction_id?: string | null; status: string; expires_at: string | null;
  auto_renew?: boolean | null; environment?: string | null; updated_at?: string;
}

export const isStoreActive = (row: StoreRow | null, now: number = Date.now()) =>
  !!row && STORE_ACTIVE_STATUSES.includes(row.status as StoreStatus) &&
  !!row.expires_at && new Date(row.expires_at).getTime() > now;

export const productAllowed = (id: string) =>
  STORE_PREMIUM_PRODUCT_IDS.length === 0 || STORE_PREMIUM_PRODUCT_IDS.includes(id);

/** Newest active store row for the user, or null. Throws on DB error. */
export async function activeStoreSubscription(admin: any, userId: string): Promise<StoreRow | null> {
  const { data, error } = await admin.from("store_subscriptions")
    .select("id, store, product_id, status, expires_at, auto_renew, environment, updated_at")
    .eq("user_id", userId).in("status", STORE_ACTIVE_STATUSES)
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false }).limit(5);
  if (error) throw new Error("store_subscriptions query failed");
  return (data ?? []).find((r: StoreRow) => isStoreActive(r)) ?? null;
}

/** Access object for a store row, shared by conversation-tool-access `status` and verify-store-purchase. */
export const storeAccessShape = (row: StoreRow) => ({
  source: row.store === "apple" ? "app_store" : "google_play",
  expires_at: row.expires_at,
  current_period_end: row.expires_at,
  subscription_status: row.status,
  cancel_at_period_end: !row.auto_renew,
  stripe_customer_id: null,
  stripe_subscription_id: null,
});

/** True if a row with this store identifier already exists (unique-index race). */
export const isUniqueViolation = (e: unknown) => (e as any)?.code === "23505";

// ── small utils ──
export const tokenRef = async (token: string) => {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)));
  return Array.from(h.slice(0, 4)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
export const isUuid = (s: unknown): s is string =>
  typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const b64urlToBytes = (s: string) => {
  const b = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b + "=".repeat((4 - (b.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const bytesToB64url = (b: Uint8Array) =>
  btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const strB64url = (s: string) => bytesToB64url(new TextEncoder().encode(s));
export const decodeJwsPayloadUnverified = (jws: string): any => {
  const p = jws.split(".")[1];
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
};
const pemToDer = (pem: string) =>
  Uint8Array.from(atob(pem.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "")), (c) => c.charCodeAt(0));
const ms = (v: unknown) => (v ? new Date(Number(v)).toISOString() : null);

export class StoreHttpError extends Error {
  constructor(public status: number, public code: string) { super(code); }
}

export const missingSecrets = (names: string[]) => names.filter((n) => !Deno.env.get(n));
export const APPLE_SECRETS = ["APPLE_IAP_ISSUER_ID", "APPLE_IAP_KEY_ID", "APPLE_IAP_PRIVATE_KEY", "APPLE_BUNDLE_ID"];
export const GOOGLE_SECRETS = ["GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", "GOOGLE_PLAY_PACKAGE_NAME"];

// ════════════════════ Apple ════════════════════
const APPLE_ROOT_CA_G3_B64 = "MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwSQXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9uIEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcNMTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBSb290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9yaXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtfTjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySrMA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gAMGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM6BgD56KyKA==";
const OID_LEAF = "1.2.840.113635.100.6.11.1";
const OID_INTERMEDIATE = "1.2.840.113635.100.6.2.1";
let appleRoot: X509Certificate | null = null;

/** Verify an Apple-signed JWS (x5c chain to Apple Root CA - G3, Apple OIDs, ES256). Returns payload or throws. */
export async function verifyAppleJws(jws: string): Promise<any> {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("bad_jws");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  if (header.alg !== "ES256" || !Array.isArray(header.x5c) || header.x5c.length < 2) throw new Error("bad_jws");
  appleRoot ??= new X509Certificate(Uint8Array.from(atob(APPLE_ROOT_CA_G3_B64), (c) => c.charCodeAt(0)));
  const leaf = new X509Certificate(Uint8Array.from(atob(header.x5c[0]), (c) => c.charCodeAt(0)));
  const inter = new X509Certificate(Uint8Array.from(atob(header.x5c[1]), (c) => c.charCodeAt(0)));
  const now = new Date();
  for (const c of [leaf, inter, appleRoot]) {
    if (c.notBefore > now || c.notAfter < now) throw new Error("cert_expired");
  }
  if (!leaf.getExtension(OID_LEAF) || !inter.getExtension(OID_INTERMEDIATE)) throw new Error("bad_oid");
  if (!(await inter.verify({ publicKey: appleRoot, signatureOnly: true }))) throw new Error("bad_chain");
  if (!(await leaf.verify({ publicKey: inter, signatureOnly: true }))) throw new Error("bad_chain");
  const key = await leaf.publicKey.export({ name: "ECDSA", namedCurve: "P-256" }, ["verify"]);
  const ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key,
    b64urlToBytes(parts[2]), new TextEncoder().encode(parts[0] + "." + parts[1]));
  if (!ok) throw new Error("bad_signature");
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
}

async function appleJwt(): Promise<string> {
  const der = pemToDer(Deno.env.get("APPLE_IAP_PRIVATE_KEY")!);
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const iat = Math.floor(Date.now() / 1000);
  const h = strB64url(JSON.stringify({ alg: "ES256", kid: Deno.env.get("APPLE_IAP_KEY_ID"), typ: "JWT" }));
  const p = strB64url(JSON.stringify({
    iss: Deno.env.get("APPLE_IAP_ISSUER_ID"), iat, exp: iat + 1200,
    aud: "appstoreconnect-v1", bid: Deno.env.get("APPLE_BUNDLE_ID"),
  }));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(h + "." + p)));
  return h + "." + p + "." + bytesToB64url(sig);
}

const APPLE_HOSTS = {
  production: "https://api.storekit.itunes.apple.com",
  sandbox: "https://api.storekit-sandbox.itunes.apple.com",
};

export interface AppleResult {
  row: Omit<StoreRow, "user_id"> & { store: "apple"; product_id: string; original_transaction_id: string };
  appAccountToken: string | null;
  bundleId: string; type: string;
}

/** Fetch a transaction + subscription status from Apple (production, then sandbox). */
export async function fetchAppleSubscription(transactionId: string): Promise<AppleResult> {
  const jwt = await appleJwt();
  const get = (host: string, path: string) =>
    fetch(host + path, { headers: { Authorization: "Bearer " + jwt } });
  let env: "production" | "sandbox" = "production";
  let res = await get(APPLE_HOSTS.production, "/inApps/v1/transactions/" + encodeURIComponent(transactionId));
  if (res.status === 404) {
    await res.body?.cancel();
    env = "sandbox";
    res = await get(APPLE_HOSTS.sandbox, "/inApps/v1/transactions/" + encodeURIComponent(transactionId));
  }
  if (res.status === 404) { await res.body?.cancel(); throw new StoreHttpError(422, "purchase_not_found"); }
  if (!res.ok) { await res.body?.cancel(); throw new StoreHttpError(502, "store_unavailable"); }
  const txn = await verifyAppleJws((await res.json()).signedTransactionInfo);

  const sres = await get(APPLE_HOSTS[env], "/inApps/v1/subscriptions/" + encodeURIComponent(transactionId));
  if (sres.status === 404) { await sres.body?.cancel(); throw new StoreHttpError(422, "purchase_not_found"); }
  if (!sres.ok) { await sres.body?.cancel(); throw new StoreHttpError(502, "store_unavailable"); }
  const sjson = await sres.json();
  let last: any = null;
  for (const g of sjson.data ?? []) for (const t of g.lastTransactions ?? [])
    if (String(t.originalTransactionId) === String(txn.originalTransactionId)) last = t;
  const latest = last?.signedTransactionInfo ? await verifyAppleJws(last.signedTransactionInfo) : txn;
  const renewal = last?.signedRenewalInfo ? await verifyAppleJws(last.signedRenewalInfo) : null;
  const status = mapAppleStatus(Number(last?.status ?? 2), renewal, latest);
  return {
    row: {
      store: "apple",
      product_id: String(latest.productId),
      original_transaction_id: String(latest.originalTransactionId),
      latest_transaction_id: String(latest.transactionId),
      status,
      expires_at: status === "grace_period" && renewal?.gracePeriodExpiresDate
        ? ms(renewal.gracePeriodExpiresDate) : ms(latest.expiresDate),
      auto_renew: renewal ? Number(renewal.autoRenewStatus) === 1 : null,
      environment: (latest.environment ?? (env === "sandbox" ? "Sandbox" : "Production")).toLowerCase() === "sandbox"
        ? "sandbox" : "production",
    },
    appAccountToken: latest.appAccountToken ?? txn.appAccountToken ?? null,
    bundleId: String(latest.bundleId ?? txn.bundleId),
    type: String(latest.type ?? txn.type),
  };
}

export function mapAppleStatus(code: number, renewal: any, txn: any): StoreStatus {
  if (txn?.revocationDate) return "refunded";
  switch (code) {
    case 1: return renewal && Number(renewal.autoRenewStatus) === 0 ? "cancelled" : "active";
    case 3: return "billing_retry";
    case 4: return "grace_period";
    case 5: return "revoked";
    default: return "expired";
  }
}

// ════════════════════ Google ════════════════════
let gToken: { token: string; exp: number } | null = null;

export const googleServiceAccount = (): { client_email: string; private_key: string } =>
  JSON.parse(Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON")!);

async function googleAccessToken(): Promise<string> {
  if (gToken && gToken.exp > Date.now() + 60_000) return gToken.token;
  const sa = googleServiceAccount();
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const iat = Math.floor(Date.now() / 1000);
  const h = strB64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const p = strB64url(JSON.stringify({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token", iat, exp: iat + 3600,
  }));
  const sig = new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(h + "." + p)));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: h + "." + p + "." + bytesToB64url(sig) }),
  });
  if (!res.ok) { await res.body?.cancel(); throw new StoreHttpError(502, "store_unavailable"); }
  const j = await res.json();
  gToken = { token: j.access_token, exp: Date.now() + Number(j.expires_in ?? 3600) * 1000 };
  return gToken.token;
}

const GP = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/";

export interface GoogleResult {
  row: Omit<StoreRow, "user_id"> & { store: "google"; product_id: string; purchase_token: string };
  obfuscatedAccountId: string | null;
  linkedPurchaseToken: string | null;
  needsAck: boolean;
}

export function mapGoogleState(state: string): StoreStatus {
  const s = String(state ?? "").replace(/^SUBSCRIPTION_STATE_/, "");
  return ({
    ACTIVE: "active", IN_GRACE_PERIOD: "grace_period", ON_HOLD: "on_hold", PAUSED: "paused",
    CANCELED: "cancelled", EXPIRED: "expired", PENDING: "pending", PENDING_PURCHASE_CANCELED: "expired",
  } as Record<string, StoreStatus>)[s] ?? "expired";
}

export async function fetchGoogleSubscription(pkg: string, token: string): Promise<GoogleResult> {
  const at = await googleAccessToken();
  const res = await fetch(GP + encodeURIComponent(pkg) + "/purchases/subscriptionsv2/tokens/" + encodeURIComponent(token),
    { headers: { Authorization: "Bearer " + at } });
  if (res.status === 404 || res.status === 410) { await res.body?.cancel(); throw new StoreHttpError(422, "purchase_not_found"); }
  if (res.status === 400) {
    const t = await res.text();
    if (/invalid|not.?found/i.test(t)) throw new StoreHttpError(422, "purchase_not_found");
    throw new StoreHttpError(502, "store_unavailable");
  }
  if (!res.ok) { await res.body?.cancel(); throw new StoreHttpError(502, "store_unavailable"); }
  const s = await res.json();
  const items: any[] = s.lineItems ?? [];
  const latest = items.slice().sort((a, b) => new Date(b.expiryTime ?? 0).getTime() - new Date(a.expiryTime ?? 0).getTime())[0] ?? {};
  const status = mapGoogleState(s.subscriptionState);
  return {
    row: {
      store: "google",
      product_id: String(latest.productId ?? ""),
      purchase_token: token,
      latest_transaction_id: s.latestOrderId ?? null,
      status,
      expires_at: latest.expiryTime ? new Date(latest.expiryTime).toISOString() : null,
      auto_renew: latest.autoRenewingPlan ? !!latest.autoRenewingPlan.autoRenewEnabled : false,
      environment: s.testPurchase ? "sandbox" : "production",
    },
    obfuscatedAccountId: s.externalAccountIdentifiers?.obfuscatedExternalAccountId ?? null,
    linkedPurchaseToken: s.linkedPurchaseToken ?? null,
    needsAck: s.acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING" && (status === "active" || status === "grace_period"),
  };
}

export async function acknowledgeGoogle(pkg: string, productId: string, token: string) {
  const at = await googleAccessToken();
  const res = await fetch(GP + encodeURIComponent(pkg) + "/purchases/subscriptions/" + encodeURIComponent(productId) +
    "/tokens/" + encodeURIComponent(token) + ":acknowledge",
    { method: "POST", headers: { Authorization: "Bearer " + at, "Content-Type": "application/json" }, body: "{}" });
  await res.body?.cancel();
  return res.ok;
}

// ════════════════════ persistence ════════════════════
/** Find existing row by store identifier. Throws on DB error. */
export async function findStoreRow(admin: any, store: "apple" | "google", id: string): Promise<StoreRow | null> {
  const col = store === "apple" ? "original_transaction_id" : "purchase_token";
  const { data, error } = await admin.from("store_subscriptions").select("*")
    .eq("store", store).eq(col, id).maybeSingle();
  if (error) throw new Error("store_subscriptions lookup failed");
  return data ?? null;
}

/** Insert or update a row (service role). Returns the saved row. Throws on DB error. */
export async function saveStoreRow(admin: any, existing: StoreRow | null, row: StoreRow): Promise<StoreRow> {
  const q = existing?.id
    ? admin.from("store_subscriptions").update(row).eq("id", existing.id)
    : admin.from("store_subscriptions").insert(row);
  const { data, error } = await q.select("*").single();
  if (error) {
    const err: any = new Error("store_subscriptions save failed");
    err.code = error.code;
    throw err;
  }
  return data;
}

export async function profileExists(admin: any, id: string | null | undefined) {
  if (!isUuid(id)) return false;
  const { data, error } = await admin.from("profiles").select("id").eq("id", id).maybeSingle();
  if (error) throw new Error("profiles lookup failed");
  return !!data;
}
