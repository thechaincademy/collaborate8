// Google OAuth callback. Never logs the code, tokens or state.
import { createSupabaseAdmin } from "../_shared/supabase.ts";
import { ALLOWED_ADMIN_EMAILS, DASHBOARD_URL, googleClient, redirectUri, verifyState } from "../_shared/google-oauth.ts";

const go = (qs: string) => new Response(null, { status: 302, headers: { Location: `${DASHBOARD_URL}?${qs}` } });
const fail = (reason: string) => go(`google=error&reason=${encodeURIComponent(reason)}`);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const gErr = url.searchParams.get("error");
    if (gErr) return fail(gErr.replace(/[^a-z_]/gi, "").slice(0, 40) || "google_error");

    const state = await verifyState(url.searchParams.get("state"));
    if (!state.ok) return fail(state.reason);

    const code = url.searchParams.get("code");
    if (!code) return fail("missing_code");

    const admin = createSupabaseAdmin();
    const { data: u } = await admin.auth.admin.getUserById(state.uid);
    const email = (u?.user?.email ?? "").toLowerCase();
    const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: state.uid });
    if (!u?.user || !isAdmin || !ALLOWED_ADMIN_EMAILS.includes(email)) return fail("not_admin");

    const client = googleClient();
    if (!client) return fail("not_configured");

    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: client.id,
        client_secret: client.secret,
        redirect_uri: redirectUri(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokRes.ok) return fail("exchange_failed");
    const tok = await tokRes.json();
    if (!tok.refresh_token) return fail("no_refresh_token");

    let accountEmail: string | null = null;
    try {
      const ui = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (ui.ok) accountEmail = (await ui.json()).email ?? null;
    } catch { /* email is optional */ }

    const { error } = await admin.from("google_oauth_tokens").upsert(
      { provider: "google", refresh_token: tok.refresh_token, scopes: tok.scope ?? null, account_email: accountEmail, updated_at: new Date().toISOString() },
      { onConflict: "provider" },
    );
    if (error) return fail("save_failed");

    // admin-analytics caches Google results for 15 minutes; mark them stale.
    await admin.from("app_settings").upsert({ key: "google_cache_bust", value: String(Date.now()), updated_at: new Date().toISOString() }, { onConflict: "key" });
    return go("google=connected");
  } catch {
    return fail("unexpected");
  }
});
