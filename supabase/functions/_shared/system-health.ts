// Collabor8 system health checks. Server-only.
// Returns service names, statuses, HTTP status codes and response times only.
// Never returns secret values, message text, emails, phone numbers or bank data.
import { vertexConfigured, vertexToken, VERTEX_MODEL } from "./vertex.ts";

export type ServiceStatus = "up" | "problem" | "down" | "not_configured";
export interface ServiceCheck {
  key: string;
  label: string;
  status: ServiceStatus;
  http_status: number | null;
  response_ms: number | null;
  /** Short fixed reason written by this file, never a provider message. */
  detail: string | null;
  /** Only alertable services send down/recovered emails. */
  alertable: boolean;
}

const SLOW_MS = 8000;
const TIMEOUT_MS = 10000;
const has = (name: string) => Boolean((Deno.env.get(name) ?? "").trim());

async function timed(url: string, init: RequestInit = {}): Promise<{ status: number | null; ms: number; timedOut: boolean }> {
  const started = performance.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    await res.body?.cancel().catch(() => {});
    return { status: res.status, ms: Math.round(performance.now() - started), timedOut: false };
  } catch (e) {
    const timedOut = (e as Error)?.name === "TimeoutError" || (e as Error)?.name === "AbortError";
    return { status: null, ms: Math.round(performance.now() - started), timedOut };
  }
}

function classify(r: { status: number | null; ms: number; timedOut: boolean }, okStatuses: number[]): { status: ServiceStatus; detail: string | null } {
  if (r.status === null) return { status: "down", detail: r.timedOut ? "Timed out after 10 seconds" : "No response" };
  if (r.status === 404) return { status: "down", detail: "Not deployed (HTTP 404)" };
  if (r.status >= 500) return { status: "down", detail: `Server error (HTTP ${r.status})` };
  if (!okStatuses.includes(r.status)) return { status: "problem", detail: `Unexpected response (HTTP ${r.status})` };
  if (r.ms > SLOW_MS) return { status: "problem", detail: `Slow response (over ${SLOW_MS / 1000} seconds)` };
  return { status: "up", detail: null };
}

const base = () => (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");

async function checkDatabase(): Promise<ServiceCheck> {
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const r = await timed(`${base()}/rest/v1/app_settings?select=key&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  return { key: "database", label: "Backend database & API", ...classify(r, [200]), http_status: r.status, response_ms: r.status === null ? null : r.ms, alertable: true };
}

async function checkAuth(): Promise<ServiceCheck> {
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const r = await timed(`${base()}/auth/v1/health`, { headers: { apikey: anon } });
  return { key: "auth", label: "Sign-in (auth)", ...classify(r, [200]), http_status: r.status, response_ms: r.status === null ? null : r.ms, alertable: true };
}

/** CORS preflight only: proves the function is deployed and boots, with no side effects. */
async function checkFunction(slug: string, label: string, requiredSecrets: string[]): Promise<ServiceCheck> {
  const r = await timed(`${base()}/functions/v1/${slug}`, {
    method: "OPTIONS",
    headers: { Origin: "https://collaborate8.com", "Access-Control-Request-Method": "POST" },
  });
  const c = classify(r, [200, 204]);
  const missing = requiredSecrets.filter((n) => !has(n));
  if (c.status === "up" && missing.length) {
    return { key: `fn:${slug}`, label, status: "not_configured", detail: `Running, but needs ${missing.join(", ")}`, http_status: r.status, response_ms: r.ms, alertable: true };
  }
  return { key: `fn:${slug}`, label, ...c, http_status: r.status, response_ms: r.status === null ? null : r.ms, alertable: true };
}

async function checkVertex(): Promise<ServiceCheck> {
  const label = "Calm check AI (Vertex, London)";
  if (!vertexConfigured()) return { key: "vertex", label, status: "not_configured", detail: "Needs GCP_VERTEX_SA_JSON", http_status: null, response_ms: null, alertable: true };
  const location = (Deno.env.get("VERTEX_LOCATION") ?? "europe-west2").trim();
  if (!location || location === "global" || location === "us" || location === "eu") {
    return { key: "vertex", label, status: "problem", detail: "Regional London endpoint required, global endpoint blocked", http_status: null, response_ms: null, alertable: true };
  }
  const project = Deno.env.get("VERTEX_PROJECT") ?? "collaborate8-c9e7f";
  const started = performance.now();
  let token: string;
  try {
    token = await vertexToken();
  } catch {
    return { key: "vertex", label, status: "down", detail: "Could not sign in to Google Cloud", http_status: null, response_ms: Math.round(performance.now() - started), alertable: true };
  }
  // countTokens is free and does not run the model. Fixed probe text, no user content.
  const r = await timed(
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/${VERTEX_MODEL()}:countTokens`,
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "health check" }] }] }) },
  );
  const c = r.status === 429 ? { status: "problem" as const, detail: "Busy (HTTP 429)" } : classify(r, [200]);
  return { key: "vertex", label, ...c, http_status: r.status, response_ms: r.status === null ? null : r.ms, alertable: true };
}

async function checkStripeApi(): Promise<ServiceCheck> {
  const label = "Stripe API";
  const key = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  if (!key) {
    // Unauthenticated call: a 401 proves Stripe is reachable from the London server.
    const r = await timed("https://api.stripe.com/v1/charges?limit=1");
    const reachable = r.status === 401;
    return { key: "stripe_api", label, status: reachable ? "not_configured" : "down", detail: reachable ? "Reachable, needs STRIPE_SECRET_KEY" : "Not reachable", http_status: r.status, response_ms: r.status === null ? null : r.ms, alertable: false };
  }
  const r = await timed("https://api.stripe.com/v1/balance", { headers: { Authorization: `Bearer ${key}` } });
  const c = r.status === 401 ? { status: "problem" as const, detail: "Key rejected (HTTP 401)" } : classify(r, [200]);
  return { key: "stripe_api", label, ...c, http_status: r.status, response_ms: r.status === null ? null : r.ms, alertable: true };
}

function checkEmailProvider(): ServiceCheck {
  const ok = has("RESEND_API_KEY") && has("EMAIL_FROM");
  return {
    key: "email_provider", label: "Email provider (Resend, EU region)",
    status: ok ? "up" : "not_configured",
    detail: ok ? "Configured. Sends fail until the sending domain is verified." : `Needs ${["RESEND_API_KEY", "EMAIL_FROM"].filter((n) => !has(n)).join(", ")}`,
    http_status: null, response_ms: null, alertable: false,
  };
}

function checkPush(): ServiceCheck {
  const web = has("VAPID_PUBLIC_KEY") && has("VAPID_PRIVATE_KEY");
  const app = has("FIREBASE_SERVICE_ACCOUNT");
  const missing = [...(web ? [] : ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY"]), ...(app ? [] : ["FIREBASE_SERVICE_ACCOUNT"])];
  return {
    key: "push", label: "Push notifications",
    status: web && app ? "up" : "not_configured",
    detail: missing.length ? `Needs ${missing.join(", ")}` : null,
    http_status: null, response_ms: null, alertable: false,
  };
}

export async function runServiceChecks(): Promise<ServiceCheck[]> {
  return await Promise.all([
    checkDatabase(),
    checkAuth(),
    checkFunction("chat-rewrite", "Calm check function", ["GCP_VERTEX_SA_JSON"]),
    checkFunction("stripe-subscriptions", "Stripe payments function", ["STRIPE_SECRET_KEY"]),
    checkFunction("stripe-webhooks", "Stripe webhooks function", ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET_PLATFORM"]),
    checkFunction("send-notification-email", "Email and push sending function", ["RESEND_API_KEY"]),
    checkFunction("safeguarding-alert", "Alert sending function", ["RESEND_API_KEY"]),
    checkVertex(),
    checkStripeApi(),
    Promise.resolve(checkEmailProvider()),
    Promise.resolve(checkPush()),
  ]);
}

/** Which integration secrets are set. Names and true/false only. */
export const SETUP_SECRETS: { group: string; names: string[] }[] = [
  { group: "Instagram, LinkedIn and TikTok (Buffer)", names: ["BUFFER_API_KEY"] },
  { group: "YouTube", names: ["YOUTUBE_API_KEY"] },
  { group: "Microsoft Clarity", names: ["CLARITY_API_TOKEN"] },
  { group: "GA4, Search Console and Business Profile (Google)", names: ["GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_OAUTH_CLIENT_SECRET"] },
  { group: "Stripe", names: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET_PLATFORM", "STRIPE_WEBHOOK_SECRET"] },
  { group: "Email (Resend, EU)", names: ["RESEND_API_KEY", "EMAIL_FROM"] },
  { group: "Alert recipients", names: ["DSL_ALERT_EMAIL", "QA_ALERT_EMAIL"] },
  { group: "Calm check AI (Vertex, London)", names: ["GCP_VERTEX_SA_JSON", "VERTEX_LOCATION", "VERTEX_MODEL"] },
  { group: "Push notifications", names: ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "FIREBASE_SERVICE_ACCOUNT"] },
  { group: "App store purchases", names: ["APPLE_BUNDLE_ID", "APPLE_IAP_ISSUER_ID", "APPLE_IAP_KEY_ID", "APPLE_IAP_PRIVATE_KEY", "GOOGLE_PLAY_PACKAGE_NAME", "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON"] },
  { group: "Error reporting (Sentry)", names: ["SENTRY_DSN"] },
];
export const setupStatus = () => SETUP_SECRETS.map((g) => ({ group: g.group, secrets: g.names.map((name) => ({ name, set: has(name) })) }));

export const utcStamp = (iso: string | Date) => new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC";
