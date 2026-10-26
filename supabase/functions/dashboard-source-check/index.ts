// TEMPORARY test function. Delete after one call.
import { corsHeaders } from "../_shared/cors.ts";
import { getYouTubeAnalytics } from "../_shared/youtube-analytics.ts";
import { getClarityAnalytics } from "../_shared/clarity-analytics.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const [youtube, clarity] = await Promise.all([getYouTubeAnalytics(), getClarityAnalytics()]);
  return new Response(JSON.stringify({ youtube, clarity }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
