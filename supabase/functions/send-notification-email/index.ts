import webpush from "npm:web-push@3.6.7";
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const APP_URL = "https://collaborate8.com";
const UUID = /^[0-9a-f-]{36}$/i;

// Keep in sync with src/lib/notificationTypes.ts
function categoryOf(type: string): string {
  if (type === "thread_ack_required") return "ack_required";
  if (type === "thread_deadline_soon") return "deadline_soon";
  if (type === "thread_deadline_missed") return "deadline_missed";
  if (type === "thread_propose") return "proposal";
  if (type === "thread_confirm") return "confirmed";
  if (type === "calendar_reminder" || type === "due") return "calendar";
  if (type === "message" || type.startsWith("thread_")) return "message";
  return "money";
}

async function sendPush(supabase: ReturnType<typeof createSupabaseAdmin>, n: any) {
  const pub = Deno.env.get("VAPID_PUBLIC_KEY");
  const priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return 0;
  webpush.setVapidDetails("mailto:hello@collaborate8.com", pub, priv);
  const { data: subs } = await supabase.from("push_subscriptions").select("*").eq("user_id", n.user_id);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title: n.title, body: n.message, url: n.link || "/dashboard", tag: n.id }),
        { TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("id", s.id);
      else console.error("[push]", code, (e as Error).message);
    }
  }
  return sent;
}

// --- Firebase Cloud Messaging (device push tokens) ---

let fcmTokenCache: { accessToken: string; expiresAt: number } | null = null;

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function base64url(data: ArrayBuffer | Uint8Array | string): string {
  let bytes: Uint8Array;
  if (typeof data === "string") bytes = new TextEncoder().encode(data);
  else if (data instanceof Uint8Array) bytes = data;
  else bytes = new Uint8Array(data);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getFcmAccessToken(sa: { client_email: string; private_key: string; token_uri?: string }): Promise<string> {
  if (fcmTokenCache && Date.now() < fcmTokenCache.expiresAt - 60_000) {
    return fcmTokenCache.accessToken;
  }
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${claims}`),
  );
  const jwt = `${header}.${claims}.${base64url(signature)}`;

  const res = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) throw new Error(`FCM token exchange failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  fcmTokenCache = { accessToken: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}

function isStaleFcmToken(status: number, body: string): boolean {
  if (status === 404) return true;
  try {
    const err = JSON.parse(body)?.error;
    const code = err?.details?.find((d: any) => d["@type"]?.includes("FcmError"))?.errorCode ?? err?.status;
    if (code === "UNREGISTERED") return true;
    if (code === "INVALID_ARGUMENT" && /registration token/i.test(body)) return true;
  } catch { /* ignore parse errors */ }
  return false;
}

async function sendFcm(supabase: ReturnType<typeof createSupabaseAdmin>, n: any): Promise<number> {
  try {
    const raw = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!raw) {
      console.warn("[fcm] FIREBASE_SERVICE_ACCOUNT not set; skipping");
      return 0;
    }
    let sa: { client_email: string; private_key: string; project_id: string; token_uri?: string };
    try {
      sa = JSON.parse(raw);
    } catch {
      console.warn("[fcm] FIREBASE_SERVICE_ACCOUNT is not valid JSON; skipping");
      return 0;
    }
    if (!sa.client_email || !sa.private_key || !sa.project_id) {
      console.warn("[fcm] FIREBASE_SERVICE_ACCOUNT missing required fields; skipping");
      return 0;
    }

    const { data: tokens } = await supabase.from("device_push_tokens").select("*").eq("user_id", n.user_id);
    if (!tokens?.length) return 0;

    const accessToken = await getFcmAccessToken(sa);
    const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`;
    let sent = 0;
    for (const t of tokens) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            message: {
              token: t.token,
              notification: { title: n.title, body: n.message },
              data: { link: String(n.link || "/dashboard") },
            },
          }),
        });
        if (res.ok) {
          sent++;
        } else {
          const body = await res.text();
          if (isStaleFcmToken(res.status, body)) {
            await supabase.from("device_push_tokens").delete().eq("id", t.id);
          } else {
            console.error(`[fcm] send failed [${res.status}]: ${body}`);
          }
        }
      } catch (e) {
        console.error("[fcm] send error:", (e as Error).message);
      }
    }
    return sent;
  } catch (e) {
    console.error("[fcm] unexpected error:", (e as Error).message);
    return 0;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { notificationId } = await req.json().catch(() => ({}));
    if (typeof notificationId !== "string" || !UUID.test(notificationId)) return json({ error: "Invalid id" }, 400);

    const supabase = createSupabaseAdmin();
    const { data: n } = await supabase.from("notifications").select("*").eq("id", notificationId).maybeSingle();
    if (!n || n.email_sent_at) return json({ skipped: true });
    if (Date.now() - new Date(n.created_at).getTime() > 10 * 60 * 1000) return json({ skipped: "stale" });

    // Claim atomically (covers both push and email so each notification is only sent once)
    const { data: claimed } = await supabase.from("notifications").update({ email_sent_at: new Date().toISOString() })
      .eq("id", n.id).is("email_sent_at", null).select("id");
    if (!claimed?.length) return json({ skipped: true });

    const { data: prefRow } = await supabase.from("notification_preferences").select("prefs").eq("user_id", n.user_id).maybeSingle();
    const cat = categoryOf(n.type);
    const pref = (prefRow?.prefs as Record<string, { push?: boolean; email?: boolean }> | undefined)?.[cat] ?? {};

    const pushed = pref.push === false ? 0 : await sendPush(supabase, n);
    const fcmSent = pref.push === false ? 0 : await sendFcm(supabase, n);

    if (pref.email === false) return json({ pushed, fcmSent, email: "off" });

    // Throttle plain chat emails: one per 15 minutes per recipient
    if (n.type === "message" || n.type === "thread_message") {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", n.user_id).in("type", ["message", "thread_message"]).neq("id", n.id).gte("email_sent_at", since);
      if ((count ?? 0) > 0) return json({ pushed, fcmSent, email: "throttled" });
    }

    const { data: u } = await supabase.auth.admin.getUserById(n.user_id);
    const email = u?.user?.email;
    if (!email) return json({ pushed, fcmSent, email: "none" });

    const result = await sendTemplateEmail("coparent_notification", email, {
      templateData: { title: n.title, message: n.message, url: `${APP_URL}${n.link || "/dashboard"}` },
      idempotencyKey: `notification-${n.id}`,
    });
    return json({ pushed, fcmSent, result });
  } catch (e) {
    console.error("[send-notification-email]", (e as Error).message);
    return json({ error: "Failed" }, 500);
  }
});
