import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin } from "../_shared/supabase.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const { data, error } = await createSupabaseAdmin().rpc("create_due_tomorrow_notifications");
  return new Response(JSON.stringify(error ? { error: error.message } : { created: data }), {
    status: error ? 500 : 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
