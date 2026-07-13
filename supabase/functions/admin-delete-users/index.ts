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

  const results = [];
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id);
    results.push({ id, ok: !error, error: error?.message });
  }

  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
