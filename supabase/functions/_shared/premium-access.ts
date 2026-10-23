// Deploy target: supabase/functions/_shared/premium-access.ts
import { createSupabaseAdmin, getUserFromRequest } from "./supabase.ts";
import { isActive } from "./conversation-tool-access-rule.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

export const requirePremium = async (req: Request, feature: string): Promise<Response | null> => {
  let user;
  try {
    user = await getUserFromRequest(req);
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data, error } = await createSupabaseAdmin().from("conversation_tool_access")
    .select("source, expires_at, subscription_status, current_period_end")
    .eq("user_id", user.id).maybeSingle();
  if (error) return new Response(JSON.stringify({ error: "entitlement_unavailable" }), {
    status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (isActive(data)) return null;
  return new Response(JSON.stringify({ error: "premium_required", feature }), {
    status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
};