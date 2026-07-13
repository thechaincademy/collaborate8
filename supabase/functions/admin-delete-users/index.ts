import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ids = [
    "80171566-c4f0-4271-9751-528340aa9085",
    "ed69bc7f-e942-4f12-b3c2-fc7596cfa2ce",
    "9215d8f9-4144-4214-a956-3f0085b11f82",
  ];

  // Pre-clean public data referencing these users to avoid trigger/cascade errors
  await admin.from("audit_events").delete().in("user_id", ids);
  await admin.from("invitations").delete().in("inviter_id", ids);
  await admin.from("connected_accounts").delete().in("user_id", ids);
  await admin.from("bank_connections").delete().in("user_id", ids);
  await admin.from("recurring_payments").delete().or(`payer_id.in.(${ids.join(",")}),receiver_id.in.(${ids.join(",")})`);
  await admin.from("messages").delete().in("sender_id", ids);
  await admin.from("profiles").delete().in("id", ids);

  const results = [];
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    results.push({ id, ok: !error, error: error ? JSON.stringify(error, Object.getOwnPropertyNames(error)) : null });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
