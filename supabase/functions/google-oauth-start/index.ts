import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { ALLOWED_ADMIN_EMAILS, GOOGLE_SCOPES, googleClient, redirectUri, safeReturnUrl, signState } from "../_shared/google-oauth.ts";

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
  if (!client) return json({ error: "Google login client not set up yet", code: "google_client_not_set_up" }, 503);

  // Where to come back to after Google: the admin's own site, if it is on the allow-list.
  const body = await req.json().catch(() => ({}));
  const returnTo = safeReturnUrl(body?.return_origin ?? req.headers.get("Origin"), body?.return_path);

  const params = new URLSearchParams({
    client_id: client.id,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: await signState(caller.id, returnTo),
  });
  return json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
});
