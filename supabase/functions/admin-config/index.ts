// Admin-only platform settings for /admin/setup.
// status: every setting, whether it is set and where from. Secret values are never returned;
//   plain settings (emails, region, ids) show their current value.
// set: checks the format, then saves (secrets go to Supabase Vault).
// remove: deletes the admin value, so the Supabase secret (if any) is used again.
import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";
import { ALLOWED_ADMIN_EMAILS } from "../_shared/google-oauth.ts";
import { cfgSource, loadConfig } from "../_shared/config.ts";
import { SETTING_BY_NAME, SETTING_GROUPS, SETTINGS } from "../_shared/config-registry.ts";
import { isMissingStoreError } from "../_shared/analytics-connections.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STORE_NOT_READY = "Changing settings from the admin needs a database update that is waiting for approval.";

type Row = { name: string; is_secret: boolean; plain_value: string | null; updated_at: string; updated_by_email: string | null };

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
      await loadConfig(true);
      const { data, error } = await admin.rpc("app_config_status");
      const ready = !error;
      const rows = new Map(((data ?? []) as Row[]).map((r) => [r.name, r]));
      const groups = SETTING_GROUPS.map((group) => ({
        group,
        items: SETTINGS.filter((s) => s.group === group).map((s) => {
          const row = rows.get(s.name);
          const source = row ? "admin" : cfgSource(s.name) === "secret" ? "secret" : null;
          const envVal = Deno.env.get(s.name) ?? "";
          return {
            name: s.name,
            label: s.label,
            secret: s.secret,
            multiline: !!s.multiline,
            note: s.note ?? null,
            set: !!source,
            source,
            value: s.secret ? null : row ? row.plain_value : envVal.trim() ? envVal : null,
            updated_at: row?.updated_at ?? null,
            updated_by_email: row?.updated_by_email ?? null,
          };
        }),
      }));
      return json({ store_ready: ready, groups });
    }

    const name = String(body?.name ?? "");
    const setting = SETTING_BY_NAME.get(name);
    if (!setting) return json({ error: "That setting can't be changed here." }, 400);

    if (action === "set") {
      const raw = typeof body?.value === "string" ? body.value : "";
      const value = raw.trim();
      if (!value) return json({ error: "Enter a value." }, 400);
      if (value.length > (setting.secret ? 20000 : 2000)) return json({ error: "That value is too long." }, 400);
      const problem = setting.check(value);
      if (problem) return json({ error: problem }, 400);
      const { error } = await admin.rpc("app_config_set", { _name: name, _value: value, _is_secret: setting.secret, _by: caller.id });
      if (error) {
        if (isMissingStoreError(error)) return json({ error: STORE_NOT_READY, code: "store_not_ready" }, 503);
        console.error("admin-config set failed", { name, code: error.code });
        return json({ error: "Could not save. Try again later." }, 500);
      }
      console.log("admin-config set", { name, by: caller.id });
      return json({ ok: true, name });
    }

    if (action === "remove") {
      const { error } = await admin.rpc("app_config_remove", { _name: name });
      if (error) {
        if (isMissingStoreError(error)) return json({ error: STORE_NOT_READY, code: "store_not_ready" }, 503);
        console.error("admin-config remove failed", { name, code: error.code });
        return json({ error: "Could not remove. Try again later." }, 500);
      }
      console.log("admin-config removed", { name, by: caller.id });
      return json({ ok: true, name, falls_back_to_secret: !!(Deno.env.get(name) ?? "").trim() });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("admin-config error", (e as Error).name);
    return json({ error: "Request failed. Please try again later." }, 500);
  }
});
