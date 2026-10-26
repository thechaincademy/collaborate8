import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { ALLOWED_ADMIN_EMAILS, GOOGLE_SCOPES, googleClient, redirectUri, signState } from "../_shared/google-oauth.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let caller;
  try {
    caller = await getUserFromRequest(req);
  } catch {
    return json({ error: "Not signed in" }, 401);
  }
  const admin = createSupabaseAdmin();
  const email = (caller.email ?? "").toLowerCase();
  const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: caller.id });
  if (!isAdmin || !ALLOWED_ADMIN_EMAILS.includes(email)) return json({ error: "Forbidden" }, 403);

  const client = googleClient();
  if (!client) return json({ error: "Google OAuth client not configured" }, 500);

  const params = new URLSearchParams({
    client_id: client.id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: await signState(caller.id),
  });
  return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});
