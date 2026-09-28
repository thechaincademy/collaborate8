import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not signed in" }, 401);

    const admin = createSupabaseAdmin();

    const { count: activeSubs } = await admin.from("recurring_payments").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).eq("is_active", true);
    if ((activeSubs ?? 0) > 0) {
      return json({ error: "active_payment", message: "Please stop your recurring maintenance payment first, then delete your account." }, 409);
    }

    await admin.from("audit_events").insert({ user_id: user.id, event_type: "account_deletion_requested", entity_type: "profile", entity_id: user.id });

    // Unlink co-parent on both sides so neither account depends on the other
    await admin.from("profiles").update({ coparent_id: null }).eq("coparent_id", user.id);
    await admin.from("profiles").update({ coparent_id: null, first_name: null, last_name: null }).eq("id", user.id);
    await admin.from("push_subscriptions").delete().eq("user_id", user.id);
    await admin.from("notification_preferences").delete().eq("user_id", user.id);

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      // Payment records must be kept for tax and fraud rules, so the login is closed and personal details removed.
      await admin.auth.admin.updateUserById(user.id, { ban_duration: "876000h" });
      return json({ status: "closed", message: "Your account is closed and your personal details are removed. Payment records are kept for 6 years as the law requires." });
    }
    return json({ status: "deleted" });
  } catch (e) {
    console.error("[delete-account]", (e as Error).message);
    return json({ error: "Could not delete the account" }, 500);
  }
});
