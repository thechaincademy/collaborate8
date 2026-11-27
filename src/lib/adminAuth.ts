// Helpers for the Collabor8 admin area. The admin session is stored separately
// from the parent/app session, so a parent login (for example a test account)
// never counts as an admin login.

export { ADMIN_STORAGE_KEY } from "@/lib/authStorage";

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/** Safe next path for /admin/login?next=... */
export function safeAdminNext(nextRaw: string | null | undefined): string {
  const v = String(nextRaw ?? "");
  if (!v.startsWith("/") || v.startsWith("//") || v.includes("\\") || [...v].some((c) => c.charCodeAt(0) < 32)) {
    return "/admin";
  }
  const path = v.split("?")[0];
  return isAdminPath(path) ? v : "/admin";
}

export function adminLoginHref(next = "/admin"): string {
  return `/admin/login?next=${encodeURIComponent(safeAdminNext(next))}`;
}

/** Where admin sign-out always lands. No ?next=, so the login form cannot bounce back into a loading /admin page. */
export const ADMIN_LOGIN_PATH = "/admin/login";

/** How long an admin auth "Loading..." state may last before the sign-in fallback appears. */
export const ADMIN_AUTH_WAIT_MS = 5000;

export function redirectToAdminLogin(): void {
  if (typeof window !== "undefined") window.location.assign(ADMIN_LOGIN_PATH);
}

/** Which Supabase client /auth/confirm should use when verifying a magic link. */
export function confirmAuthKind(next: string): "admin" | "app" {
  return isAdminPath((next.split("?")[0] || "")) ? "admin" : "app";
}
