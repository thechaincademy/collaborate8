/** Shared fallback for historical rows whose linked profile has been deleted. */
export const DELETED_USER_NAME = "Deleted user";

export type DisplayProfile = { name?: string | null; full_name?: string | null; display_name?: string | null };

export function profileDisplayName(profile: DisplayProfile | null | undefined): string {
  return profile?.name?.trim() || profile?.full_name?.trim() || profile?.display_name?.trim() || DELETED_USER_NAME;
}

export function otherPaymentPartyId(
  payment: { payer_id: string | null; payee_id: string | null },
  viewerId: string,
): string | null {
  return payment.payee_id === viewerId ? payment.payer_id : payment.payee_id;
}