// Who may call an internal edge function: the project's service key (pg_cron, scripts, the
// Management API runbooks) or a signed-in admin (is_admin and on the admin email list).
import { createSupabaseAdmin, getUserFromRequest } from "./supabase.ts";
import { ALLOWED_ADMIN_EMAILS } from "./google-oauth.ts";

/** Constant-time check of "Authorization: Bearer <service key>". */
export function isServiceCaller(req: Request): boolean {
  const expected = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const got = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!expected || got.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

/** True for the service key or a signed-in admin. Never throws. */
export async function isServiceOrAdminCaller(req: Request): Promise<boolean> {
  if (isServiceCaller(req)) return true;
  try {
    const caller = await getUserFromRequest(req);
    const email = (caller.email ?? "").toLowerCase();
    if (!ALLOWED_ADMIN_EMAILS.includes(email)) return false;
    const { data: isAdmin } = await createSupabaseAdmin().rpc("is_admin", { _user_id: caller.id });
    return isAdmin === true;
  } catch {
    return false;
  }
}
