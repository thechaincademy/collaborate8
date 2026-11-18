// Server-only store for analytics tokens pasted by an admin (Buffer, Clarity).
// Tokens live encrypted in Supabase Vault behind service-role-only functions
// (supabase/manual/NEEDS_RAFA_APPROVAL_analytics_connections.sql). Until that
// migration is applied every helper here returns "not ready" and callers fall
// back to the env secrets. Never logs or returns token values.

export type PastedProvider = "buffer" | "clarity";
export const PASTED_PROVIDERS: PastedProvider[] = ["buffer", "clarity"];

const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "PGRST202" || e.code === "42883" || e.code === "42P01" || /could not find the function|does not exist/i.test(e.message ?? ""));

// deno-lint-ignore no-explicit-any
export async function storedToken(admin: any, provider: PastedProvider): Promise<string | null> {
  try {
    const { data, error } = await admin.rpc("analytics_connection_token", { _provider: provider });
    if (error) return null;
    return typeof data === "string" && data ? data : null;
  } catch {
    return null;
  }
}

export type StoredStatus = { ready: boolean; rows: { provider: string; account_label: string | null; connected_at: string }[] };

// deno-lint-ignore no-explicit-any
export async function storedStatus(admin: any): Promise<StoredStatus> {
  try {
    const { data, error } = await admin.rpc("analytics_connection_status");
    if (error) return { ready: false, rows: [] };
    return { ready: true, rows: (data ?? []) as StoredStatus["rows"] };
  } catch {
    return { ready: false, rows: [] };
  }
}

export { missing as isMissingStoreError };
