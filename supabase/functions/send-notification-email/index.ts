import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { sendTemplateEmail } from "../_shared/transactional-email-templates/send-email.ts";

const APP_URL = "https://collaborate8.com";
const UUID = /^[0-9a-f-]{36}$/i;

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
    // Only fresh notifications (prevents replay of old ids)
    if (Date.now() - new Date(n.created_at).getTime() > 10 * 60 * 1000) return json({ skipped: "stale" });

    // Throttle chat emails: one per 15 minutes per recipient
    if (n.type === "message") {
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", n.user_id).eq("type", "message").not("email_sent_at", "is", null).gte("email_sent_at", since);
      if ((count ?? 0) > 0) return json({ skipped: "throttled" });
    }

    // Claim atomically
    const { data: claimed } = await supabase.from("notifications").update({ email_sent_at: new Date().toISOString() })
      .eq("id", n.id).is("email_sent_at", null).select("id");
    if (!claimed?.length) return json({ skipped: true });

    const { data: u } = await supabase.auth.admin.getUserById(n.user_id);
    const email = u?.user?.email;
    if (!email) return json({ skipped: "no email" });

    const result = await sendTemplateEmail("coparent_notification", email, {
      templateData: { title: n.title, message: n.message, url: `${APP_URL}${n.link || "/dashboard"}` },
      idempotencyKey: `notification-${n.id}`,
    });
    return json(result);
  } catch (e) {
    console.error("[send-notification-email]", (e as Error).message);
    return json({ error: "Failed" }, 500);
  }
});
