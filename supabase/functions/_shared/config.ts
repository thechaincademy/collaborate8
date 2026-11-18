// Platform settings with admin overrides. Priority: value set on /admin/setup (app_config,
// secrets kept in Supabase Vault) > Supabase secret (env). Values are loaded once when the
// function starts and refreshed in the background at most once a minute, so a change made
// in the admin applies within about a minute. app_config comes from
// supabase/manual/applied_app_config.sql; if it is ever missing this simply uses env.
// Never logs values.

const REFRESH_MS = 60_000;
let overlay: Record<string, string> = {};
let loadedAt = 0;
let inflight: Promise<void> | null = null;
let storeReady = false;

async function fetchOverlay(): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/app_config_values`, {
      method: "POST",
      signal: AbortSignal.timeout(3000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    if (!r.ok) { await r.body?.cancel(); storeReady = false; overlay = {}; return; }
    const rows = (await r.json()) as { name: string; value: string | null }[];
    const next: Record<string, string> = {};
    for (const row of rows ?? []) if (row?.name && typeof row.value === "string" && row.value !== "") next[row.name] = row.value;
    overlay = next;
    storeReady = true;
  } catch {
    // Keep the last good values; env is still the fallback.
  } finally {
    loadedAt = Date.now();
  }
}

/** Reload admin settings now (or wait for a load already running). */
export function loadConfig(force = false): Promise<void> {
  if (!force && Date.now() - loadedAt < REFRESH_MS) return Promise.resolve();
  if (!inflight) inflight = fetchOverlay().finally(() => { inflight = null; });
  return inflight;
}

/** A setting: the admin value first, then the Supabase secret. */
export function cfg(name: string): string | undefined {
  if (Date.now() - loadedAt >= REFRESH_MS) void loadConfig();
  const v = overlay[name];
  return v !== undefined ? v : Deno.env.get(name);
}

/** Where a setting comes from, without its value. */
export function cfgSource(name: string): "admin" | "secret" | null {
  if (overlay[name] !== undefined) return "admin";
  return (Deno.env.get(name) ?? "").trim() ? "secret" : null;
}

export const configStoreReady = () => storeReady;

// Load once at start-up so the first request already sees admin values.
await loadConfig(true);
