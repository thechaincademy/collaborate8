import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { track } from "@/lib/analytics";

/** Metadata keys written at sign-up so details survive email confirmation. */
export const META = {
  firstName: "first_name",
  lastName: "last_name",
  coparentEmail: "c8_coparent_email",
  inviteCode: "c8_invite_code",
} as const;

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const refresh = () => window.dispatchEvent(new Event("c8-profile-refresh"));

/** Paying-parent (standard) sign-up: save name, create own invite code and invitation, email co-parent. */
export async function savePayerProfile(
  userId: string,
  firstName: string,
  lastName: string,
  coparentEmail: string | null,
): Promise<{ error: unknown; code: string }> {
  const code = generateInviteCode();
  const [profileRes, inviteRes] = await Promise.all([
    supabase.from("profiles").update({ first_name: firstName, last_name: lastName, invite_code: code }).eq("id", userId),
    supabase.from("invitations").insert({ inviter_id: userId, invite_code: code, invitee_email: coparentEmail || null }),
  ]);
  const error = profileRes.error ?? inviteRes.error;
  if (error) return { error, code };

  if (coparentEmail) {
    supabase.functions
      .invoke("send-invite-email", {
        body: { recipientEmail: coparentEmail, inviteCode: code, senderName: `${firstName} ${lastName}` },
      })
      .then(({ error }) => {
        if (error) console.error("send-invite-email failed", error);
        else void track("coparent_invite_sent", { method: "email", source: "signup" });
      })
      .catch((e) => console.error("send-invite-email failed", e));
  }
  refresh();
  return { error: null, code };
}

/** Invited sign-up: save name as viewing parent, then link both sides atomically. */
export async function saveInvitedProfile(
  userId: string,
  firstName: string,
  lastName: string,
  inviteCode: string,
): Promise<{ error: unknown }> {
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ first_name: firstName, last_name: lastName, role: "viewing" })
    .eq("id", userId);
  if (profileError) return { error: profileError };
  const { error } = await supabase.rpc("accept_coparent_invitation", { _invite_code: inviteCode.toUpperCase() });
  if (!error) {
    void track("coparent_linked", { source: "invite_accepted" });
  }
  refresh();
  return { error };
}

export type CompletionResult = "complete" | "needs_input";

const inflight = new Map<string, Promise<CompletionResult>>();

/**
 * Ensure the signed-in user's profile has a name. Fills it from sign-up metadata
 * once (running the same invite steps the sign-up flow ran), otherwise reports
 * that the user must complete their profile.
 */
export function ensureProfileComplete(user: User): Promise<CompletionResult> {
  const existing = inflight.get(user.id);
  if (existing) return existing;
  const p = (async (): Promise<CompletionResult> => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("first_name, invite_code, coparent_id")
      .eq("id", user.id)
      .maybeSingle();
    // Fail open on read errors so nobody gets locked out of the app.
    if (error || !profile) return "complete";
    if (profile.first_name && profile.first_name.trim()) return "complete";

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const first = typeof meta[META.firstName] === "string" ? (meta[META.firstName] as string).trim() : "";
    const last = typeof meta[META.lastName] === "string" ? (meta[META.lastName] as string).trim() : "";
    if (!first) return "needs_input";

    const inviteCode = typeof meta[META.inviteCode] === "string" ? (meta[META.inviteCode] as string) : "";
    const coparentEmail = typeof meta[META.coparentEmail] === "string" ? (meta[META.coparentEmail] as string) : "";

    if (inviteCode) {
      const { error } = await saveInvitedProfile(user.id, first, last, inviteCode);
      if (error) console.error("saveInvitedProfile failed", error);
      void track("signup_completed", { flow: "invited" });
    } else if (!profile.invite_code && !profile.coparent_id) {
      const { error } = await savePayerProfile(user.id, first, last, coparentEmail || null);
      if (error) console.error("savePayerProfile failed", error);
    } else {
      await supabase.from("profiles").update({ first_name: first, last_name: last }).eq("id", user.id);
      refresh();
    }
    return "complete";
  })();
  inflight.set(user.id, p);
  p.finally(() => inflight.delete(user.id));
  return p;
}
