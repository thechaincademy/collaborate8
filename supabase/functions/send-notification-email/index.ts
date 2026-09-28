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

    if (pref.email === false) return json({ pushed, email: "off" });

    // Throttle plain chat emails: one per 15 minutes per recipient
    if (n.type === "message" || n.type === "thread_message") {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", n.user_id).in("type", ["message", "thread_message"]).neq("id", n.id).gte("email_sent_at", since);
      if ((count ?? 0) > 0) return json({ pushed, email: "throttled" });
    }

    const { data: u } = await supabase.auth.admin.getUserById(n.user_id);
    const email = u?.user?.email;
    if (!email) return json({ pushed, email: "none" });

    const result = await sendTemplateEmail("coparent_notification", email, {
      templateData: { title: n.title, message: n.message, url: `${APP_URL}${n.link || "/dashboard"}` },
      idempotencyKey: `notification-${n.id}`,
    });
    return json({ pushed, result });
  } catch (e) {
    console.error("[send-notification-email]", (e as Error).message);
    return json({ error: "Failed" }, 500);
  }
});
