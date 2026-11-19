// Settings an admin may set on /admin/setup, with format checks. Anything not listed here
// cannot be set from the admin (for example SUPABASE_* keys never can).

export type Setting = {
  name: string;
  label: string;
  group: string;
  secret: boolean;
  multiline?: boolean;
  check: (v: string) => string | null; // error message, or null when fine
  note?: string;
};

const re = (r: RegExp, msg: string) => (v: string) => (r.test(v) ? null : msg);
const minLen = (n: number, msg: string) => (v: string) => (v.length >= n && !/\s/.test(v) ? null : msg);
const EMAIL = /^[^\s@,<>]+@[^\s@,<>]+\.[^\s@,<>]+$/;
const emailList = (only?: RegExp, onlyMsg?: string) => (v: string) => {
  const list = v.split(/[,;\s]+/).filter(Boolean);
  if (!list.length || list.some((e) => !EMAIL.test(e))) return "Enter one or more email addresses, separated by commas.";
  if (only && list.some((e) => !only.test(e))) return onlyMsg ?? "One of these addresses is not allowed here.";
  return null;
};
const serviceAccount = (v: string) => {
  try {
    const j = JSON.parse(v);
    if (j?.type !== "service_account" || !j.client_email || !j.private_key) return "Paste the whole service account JSON file from Google Cloud.";
    return null;
  } catch {
    return "That isn't valid JSON. Paste the whole service account file.";
  }
};

const G = {
  google: "Google login client (needed for Connect Google)",
  buffer: "Buffer fallback secret (optional, use Connect above)",
  youtube: "YouTube fallback key (optional, Connect Google covers YouTube)",
  clarity: "Clarity fallback secret (optional, use Connect above)",
  stripe: "Stripe",
  email: "Email (Resend, EU)",
  alerts: "Alert recipients",
  vertex: "Calm check AI (Vertex, London)",
  push: "Push notifications",
  store: "App store purchases",
  sentry: "Error reporting (Sentry)",
};

export const SETTINGS: Setting[] = [
  { name: "GOOGLE_OAUTH_CLIENT_ID", label: "Client ID", group: G.google, secret: false, check: re(/^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$/, "This should end in .apps.googleusercontent.com.") },
  { name: "GOOGLE_OAUTH_CLIENT_SECRET", label: "Client secret", group: G.google, secret: true, check: minLen(10, "That doesn't look like a Google client secret.") },
  { name: "BUFFER_API_KEY", label: "Buffer token", group: G.buffer, secret: true, check: minLen(10, "That doesn't look like a Buffer token.") },
  { name: "YOUTUBE_API_KEY", label: "YouTube API key", group: G.youtube, secret: true, check: re(/^AIza[0-9A-Za-z_-]{30,}$/, "A YouTube API key starts with AIza.") },
  { name: "CLARITY_API_TOKEN", label: "Clarity token", group: G.clarity, secret: true, check: minLen(10, "That doesn't look like a Clarity token.") },
  { name: "STRIPE_SECRET_KEY", label: "Secret key", group: G.stripe, secret: true, check: re(/^(sk|rk)_(live|test)_[0-9A-Za-z]{10,}$/, "A Stripe secret key starts with sk_live_, sk_test_, rk_live_ or rk_test_.") },
  { name: "STRIPE_WEBHOOK_SECRET_PLATFORM", label: "Webhook signing secret (Collabor8 payments)", group: G.stripe, secret: true, check: re(/^whsec_[0-9A-Za-z]{10,}$/, "A webhook signing secret starts with whsec_.") },
  { name: "STRIPE_WEBHOOK_SECRET", label: "Webhook signing secret (payout accounts)", group: G.stripe, secret: true, check: re(/^whsec_[0-9A-Za-z]{10,}$/, "A webhook signing secret starts with whsec_.") },
  { name: "RESEND_API_KEY", label: "Resend API key", group: G.email, secret: true, check: re(/^re_[0-9A-Za-z_]{10,}$/, "A Resend API key starts with re_.") },
  { name: "EMAIL_FROM", label: "Sender", group: G.email, secret: false, check: (v) => (/^([^<>]{1,60}<[^\s@<>]+@[^\s@<>]+>|[^\s@<>]+@[^\s@<>]+)$/.test(v) ? null : "Use an address, or a name and address like Collabor8 <hello@notify.collaborate8.com>.") },
  { name: "DSL_ALERT_EMAIL", label: "Live alert recipients", group: G.alerts, secret: false, check: emailList() },
  { name: "ACCESS_REQUEST_EMAILS", label: "Who reviews requests to join (website)", group: G.alerts, secret: false, check: emailList(), note: "Not set: Rafa and Jade. Test requests only go to the test alert inbox." },
  { name: "QA_ALERT_EMAIL", label: "Test alert recipients", group: G.alerts, secret: false, check: emailList(/@agentmail\.to$/i, "Test alerts only go to the QA inbox (an @agentmail.to address)."), note: "Test alerts only go to the QA inbox." },
  { name: "GCP_VERTEX_SA_JSON", label: "Service account JSON", group: G.vertex, secret: true, multiline: true, check: serviceAccount },
  { name: "VERTEX_LOCATION", label: "Region", group: G.vertex, secret: false, check: re(/^europe-[a-z]+[0-9]+$/, "Use a UK or EU region such as europe-west2 (London). The global endpoint is not allowed.") },
  { name: "VERTEX_MODEL", label: "Model", group: G.vertex, secret: false, check: re(/^[a-z0-9][a-z0-9.\-]{2,60}$/, "Use a model name like gemini-3.5-flash.") },
  { name: "VAPID_PUBLIC_KEY", label: "Web push public key", group: G.push, secret: false, check: re(/^[A-Za-z0-9_-]{80,100}$/, "That doesn't look like a VAPID public key."), note: "Changing the web push keys also needs a site rebuild, and devices re-subscribe on their next visit." },
  { name: "VAPID_PRIVATE_KEY", label: "Web push private key", group: G.push, secret: true, check: re(/^[A-Za-z0-9_-]{40,50}$/, "That doesn't look like a VAPID private key.") },
  { name: "FIREBASE_SERVICE_ACCOUNT", label: "Firebase service account JSON (phone push)", group: G.push, secret: true, multiline: true, check: serviceAccount },
  { name: "APPLE_BUNDLE_ID", label: "Apple bundle ID", group: G.store, secret: false, check: re(/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$/, "Use the bundle ID, like com.collaborate8.app.") },
  { name: "APPLE_IAP_ISSUER_ID", label: "App Store Connect issuer ID", group: G.store, secret: false, check: re(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, "The issuer ID looks like 12345678-1234-1234-1234-123456789012.") },
  { name: "APPLE_IAP_KEY_ID", label: "App Store Connect key ID", group: G.store, secret: false, check: re(/^[A-Z0-9]{10}$/, "The key ID is 10 letters and numbers.") },
  { name: "APPLE_IAP_PRIVATE_KEY", label: "App Store Connect private key (.p8)", group: G.store, secret: true, multiline: true, check: (v) => (/-----BEGIN PRIVATE KEY-----[\s\S]+-----END PRIVATE KEY-----/.test(v) ? null : "Paste the whole .p8 file, including the BEGIN and END lines.") },
  { name: "GOOGLE_PLAY_PACKAGE_NAME", label: "Google Play package name", group: G.store, secret: false, check: re(/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+)+$/, "Use the package name, like com.collaborate8.app.") },
  { name: "GOOGLE_PLAY_SERVICE_ACCOUNT_JSON", label: "Google Play service account JSON", group: G.store, secret: true, multiline: true, check: serviceAccount },
  { name: "SENTRY_DSN", label: "Sentry DSN", group: G.sentry, secret: false, check: re(/^https:\/\/[0-9a-f]+@o[0-9]+\.ingest\.de\.sentry\.io\/[0-9]+$/, "Use a DSN from Sentry's EU region (it contains ingest.de.sentry.io), so error data stays in the EU.") },
];

export const SETTING_BY_NAME = new Map(SETTINGS.map((s) => [s.name, s]));
export const SETTING_GROUPS = [...new Set(SETTINGS.map((s) => s.group))];
