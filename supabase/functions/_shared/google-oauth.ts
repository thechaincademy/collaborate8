import { cfg } from "./config.ts";
// Shared Google OAuth helpers. Never log tokens, codes or state.
export const ALLOWED_ADMIN_EMAILS = ["rafa@collaborate8.com", "jade@collaborate8.com"];
export const GOOGLE_SCOPES =
  "openid email https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/business.manage https://www.googleapis.com/auth/youtube.readonly";
export const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
export const DASHBOARD_URL = "https://collaborate8.com/admin/analytics";

// After Google sign-in the admin returns to the site and page they started from.
// Only these sites and pages are allowed, so the redirect cannot be pointed elsewhere.
export const ALLOWED_RETURN_ORIGINS = [
  "https://collaborate8.com",
  "https://www.collaborate8.com",
  "https://collabor8-uk-test.rafa-f1b.workers.dev",
];
const ALLOWED_RETURN_PATHS = ["/admin/analytics", "/admin/setup"];

/** Returns a safe absolute return URL, or the default dashboard when not allowed. */
export function safeReturnUrl(origin: unknown, path: unknown): string {
  const o = typeof origin === "string" ? origin.replace(/\/$/, "") : "";
  const p = typeof path === "string" && ALLOWED_RETURN_PATHS.includes(path) ? path : "/admin/analytics";
  return ALLOWED_RETURN_ORIGINS.includes(o) ? `${o}${p}` : DASHBOARD_URL;
}

export const redirectUri = () => `${Deno.env.get("SUPABASE_URL")}/functions/v1/google-oauth-callback`;

export function googleClient(): { id: string; secret: string } | null {
  const id = cfg("GOOGLE_OAUTH_CLIENT_ID");
  const secret = cfg("GOOGLE_OAUTH_CLIENT_SECRET");
  return id && secret ? { id, secret } : null;
}

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64url = (s: string) => {
  const p = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(p + "=".repeat((4 - (p.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

function bytes(view: Uint8Array): ArrayBuffer {
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer;
}

async function hmac(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", bytes(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, bytes(data)));
}

let stateKey: Uint8Array | null = null;
async function getStateKey() {
  if (!stateKey) {
    const base = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    stateKey = await hmac(enc.encode(base), enc.encode("collabor8-google-oauth-state-v1"));
  }
  return stateKey;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signState(uid: string, returnTo: string = DASHBOARD_URL): Promise<string> {
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const payload = b64url(enc.encode(JSON.stringify({ uid, nonce, rt: returnTo, exp: Date.now() + 10 * 60 * 1000 })));
  const sig = b64url(await hmac(await getStateKey(), enc.encode(payload)));
  return `${payload}.${sig}`;
}

export type StateResult = { ok: true; uid: string; returnTo: string } | { ok: false; reason: "bad_state" | "expired_state" };

export async function verifyState(state: string | null): Promise<StateResult> {
  try {
    if (!state) return { ok: false, reason: "bad_state" };
    const [payload, sig, extra] = state.split(".");
    if (!payload || !sig || extra !== undefined) return { ok: false, reason: "bad_state" };
    const expected = await hmac(await getStateKey(), enc.encode(payload));
    if (!constantTimeEqual(expected, fromB64url(sig))) return { ok: false, reason: "bad_state" };
    const body = JSON.parse(new TextDecoder().decode(fromB64url(payload)));
    if (typeof body.uid !== "string" || typeof body.exp !== "number") return { ok: false, reason: "bad_state" };
    if (Date.now() > body.exp) return { ok: false, reason: "expired_state" };
    const rt = typeof body.rt === "string" ? new URL(body.rt) : null;
    const returnTo = rt ? safeReturnUrl(rt.origin, rt.pathname) : DASHBOARD_URL;
    return { ok: true, uid: body.uid, returnTo };
  } catch {
    return { ok: false, reason: "bad_state" };
  }
}
