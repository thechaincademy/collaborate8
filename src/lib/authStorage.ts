// Clear a Supabase auth session from the browser without depending on a network
// revoke succeeding. Used by both the parent app and the admin area.

export const ADMIN_STORAGE_KEY = "c8-admin-auth";

/** Default supabase-js key for the parent/app session. */
export function appStorageKey(supabaseUrl: string | undefined): string {
  try {
    const host = supabaseUrl ? new URL(supabaseUrl).hostname : "";
    const ref = host.split(".")[0];
    if (ref) return `sb-${ref}-auth-token`;
  } catch {
    // fall through
  }
  return "sb-auth-token";
}

/** Remove the session key and any supabase-js variants that share the same prefix. */
export function clearAuthStorage(storageKey: string): void {
  if (typeof window === "undefined") return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (k && (k === storageKey || k.startsWith(`${storageKey}-`) || k.startsWith(`${storageKey}.`))) keys.push(k);
    }
    for (const k of keys) window.localStorage.removeItem(k);
  } catch {
    // storage blocked
  }
}

type AuthLike = { auth: { signOut: (opts?: { scope?: "local" | "global" | "others" }) => Promise<unknown> } };

/** Sign out locally, then always clear the storage key, even if signOut throws. */
export async function signOutAndClear(client: AuthLike, storageKey: string): Promise<void> {
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {
    // local sign-out can fail if the session is already gone; still clear storage
  }
  clearAuthStorage(storageKey);
}
