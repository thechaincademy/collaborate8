// Admin-only analytics connections for /admin/setup and /admin/analytics.
// status: which services are connected (never returns token values).
// connect: checks a pasted Buffer or Clarity token with the provider, then saves it server-side.
// disconnect: removes a saved Buffer or Clarity token.
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { ALLOWED_ADMIN_EMAILS, googleClient, YOUTUBE_SCOPE } from "../_shared/google-oauth.ts";
import { isMissingStoreError, PASTED_PROVIDERS, type PastedProvider, storedStatus } from "../_shared/analytics-connections.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STORE_NOT_READY = "Saving tokens from the admin needs a database update that is waiting for approval.";
const ENV_NAME: Record<PastedProvider, string> = { buffer: "BUFFER_API_KEY", clarity: "CLARITY_API_TOKEN" };

type Check = { ok: true; label: string } | { ok: false; message: string };

async function checkBuffer(token: string): Promise<Check> {
  try {
    const r = await fetch("https://api.buffer.com", {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query: "query { account { organizations { id name } } }" }),
    });
    if (r.status === 429) return { ok: false, message: "Buffer is busy right now. Try again in a few minutes." };
    const body = await r.json().catch(() => null);
    const org = body?.data?.account?.organizations?.[0];
    if (!r.ok || body?.errors?.length || !org) return { ok: false, message: "Buffer did not accept this token. Check it and try again." };
    return { ok: true, label: String(org.name ?? "Buffer organisation").slice(0, 120) };
  } catch {
    return { ok: false, message: "Could not reach Buffer. Try again later." };
  }
}

async function checkClarity(token: string): Promise<Check> {
  try {
    const r = await fetch("https://www.clarity.ms/export-data/api/v1/project-live-insights?numOfDays=1", {
      signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
    await r.body?.cancel().catch(() => {});
    if (r.status === 429) return { ok: false, message: "Clarity's daily limit is used up, so the token can't be checked today. Try again tomorrow." };
    if (!r.ok) return { ok: false, message: "Clarity did not accept this token. Check it and try again." };
    return { ok: true, label: "Clarity project" };
  } catch {
    return { ok: false, message: "Could not reach Clarity. Try again later." };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

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

  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "status");

  try {
    if (action === "status") {
      const { data: g } = await admin.from("google_oauth_tokens").select("scopes, account_email, updated_at").eq("provider", "google").maybeSingle();
      const store = await storedStatus(admin);
      const pasted = Object.fromEntries(PASTED_PROVIDERS.map((p) => {
        const row = store.rows.find((r) => r.provider === p);
        const env = !!Deno.env.get(ENV_NAME[p]);
        return [p, {
          connected: !!row || env,
          source: row ? "admin" : env ? "secret" : null,
          account_label: row?.account_label ?? null,
          connected_at: row?.connected_at ?? null,
        }];
      }));
      return json({
        store_ready: store.ready,
        google: {
          client_set_up: !!googleClient(),
          connected: !!g,
          account_email: g?.account_email ?? null,
          connected_at: g?.updated_at ?? null,
          youtube: String(g?.scopes ?? "").split(/\s+/).includes(YOUTUBE_SCOPE),
          youtube_key_fallback: !!Deno.env.get("YOUTUBE_API_KEY"),
        },
        ...pasted,
      });
    }

    const provider = String(body?.provider ?? "") as PastedProvider;
    if (!PASTED_PROVIDERS.includes(provider)) return json({ error: "Unknown service" }, 400);

    if (action === "connect") {
      const token = typeof body?.token === "string" ? body.token.trim() : "";
      if (token.length < 10 || token.length > 4000 || /\s/.test(token)) return json({ error: "That doesn't look like a valid token." }, 400);
      const check = provider === "buffer" ? await checkBuffer(token) : await checkClarity(token);
      if ("message" in check) return json({ error: check.message }, 400);
      const { error } = await admin.rpc("analytics_connection_save", { _provider: provider, _token: token, _label: check.label, _by: caller.id });
      if (error) {
        if (isMissingStoreError(error)) return json({ error: STORE_NOT_READY, code: "store_not_ready" }, 503);
        console.error("admin-connections save failed", { provider, code: error.code });
        return json({ error: "Could not save the connection. Try again later." }, 500);
      }
      return json({ ok: true, provider, account_label: check.label });
    }

    if (action === "disconnect") {
      const { error } = await admin.rpc("analytics_connection_remove", { _provider: provider });
      if (error) {
        if (isMissingStoreError(error)) return json({ error: STORE_NOT_READY, code: "store_not_ready" }, 503);
        console.error("admin-connections remove failed", { provider, code: error.code });
        return json({ error: "Could not disconnect. Try again later." }, 500);
      }
      return json({ ok: true, provider, env_fallback: !!Deno.env.get(ENV_NAME[provider]) });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-connections error", (e as Error).name);
    return json({ error: "Request failed. Please try again later." }, 500);
  }
});
