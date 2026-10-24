/** Shared fallback for historical rows whose linked profile has been deleted. */
export const DELETED_USER_NAME = "Deleted user";

export type DisplayProfile = { first_name?: string | null; last_name?: string | null };

export function profileDisplayName(profile: DisplayProfile | null | undefined): string {
  return [profile?.first_name?.trim(), profile?.last_name?.trim()].filter(Boolean).join(" ") || DELETED_USER_NAME;
}

// Undefined means not loaded; a null join or link means the profile is gone.
export function isDeletedProfile(id: string | null, profile?: DisplayProfile | null): boolean {
  return id === null || profile === null;
}

export function otherPaymentPartyId(
  payment: { payer_id: string | null; payee_id: string | null },
  viewerId: string,
): string | null {
  return payment.payee_id === viewerId ? payment.payer_id : payment.payee_id;
}