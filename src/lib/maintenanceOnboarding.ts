export type MaintenanceOnboardingStep =
  | "setup-card"
  | "receiving-question"
  | "payer-explainer"
  | "setup-connect"
  | "payment-amount"
  | "payment-frequency"
  | "complete"
  | "waiting-coparent";

// Invited signup assigns viewing automatically, so confirm payment direction locally.
export const initialMaintenanceStep = (role?: string): MaintenanceOnboardingStep =>
  role === "managing" ? "setup-card" : "receiving-question";

export const maintenanceReceivingAnswer = (receiving: boolean): MaintenanceOnboardingStep =>
  receiving ? "setup-connect" : "payer-explainer";

export const maintenancePayerAction = (addMethod: boolean): MaintenanceOnboardingStep =>
  addMethod ? "setup-card" : "waiting-coparent";

export const afterMaintenanceCard = (invitedPayer = false): MaintenanceOnboardingStep =>
  invitedPayer ? "waiting-coparent" : "payment-amount";
// Maintenance role gate. The "role confirmed" flag used to live only in this browser's
// localStorage, so a new browser, a cleared browser or a new site address (the move to
// collaborate8.com) asked every parent to pick their role again. Account data now counts
// as confirmation too: a parent who is already on an arrangement (payer or payee), a
// paying parent with a saved card, or a receiving parent who has started Stripe payouts.
// When a live Stripe lookup fails, the stored arrangement and payout status are used
// instead of sending the parent back to setup.
export type MaintenanceRoleGate = "loading" | "picker" | "confirmed";

export interface MaintenanceRoleEvidence {
  localConfirmed: boolean;
  role?: string | null;
  hasOwnArrangement: boolean;
  hasCoparentArrangement?: boolean;
  cardCount: number;
  connectStatus: string; // loading | not_created | pending | pending_capabilities | complete
  evidenceLoading: boolean;
}

const STARTED_PAYOUTS = new Set(["pending", "pending_capabilities", "complete"]);

// Account evidence that the role is settled, not just this browser's flag.
// A parent with an arrangement (as payer or as payee) is settled. A paying parent
// with a saved card, or a receiving parent who has started Stripe payouts, is too.
// Used to hide the "switch role" link.
export const maintenanceRoleSettled = (e: Pick<MaintenanceRoleEvidence, "role" | "hasOwnArrangement" | "hasCoparentArrangement" | "cardCount" | "connectStatus">): boolean => {
  if (e.hasOwnArrangement || e.hasCoparentArrangement) return true;
  if (e.role === "managing" && e.cardCount > 0) return true;
  if (e.role === "viewing" && STARTED_PAYOUTS.has(e.connectStatus)) return true;
  return false;
};

export const maintenanceRoleGate = (e: MaintenanceRoleEvidence): MaintenanceRoleGate => {
  if (e.localConfirmed) return "confirmed";
  if (maintenanceRoleSettled(e)) return "confirmed";
  if (e.evidenceLoading) return "loading";
  return "picker";
};

// When the live Stripe check-status call fails or is missing, use the status
// already stored on the connected_accounts row. Never treat a failed lookup as
// "not_created" if the database already recorded payout setup.
export const resolveConnectStatus = (
  live: { status?: string } | null,
  stored: { onboarding_status?: string | null } | null,
): string => {
  const liveStatus = live?.status;
  if (liveStatus && liveStatus !== "not_created") return liveStatus;
  const storedStatus = stored?.onboarding_status ?? undefined;
  if (storedStatus && storedStatus !== "not_created") return storedStatus;
  if (liveStatus) return liveStatus;
  if (storedStatus) return storedStatus;
  return "not_created";
};

// The paying-parent "Connect your account" wizard is only for setting up a new
// arrangement. A payer who already has a live arrangement should not see it,
// even if a live Stripe card or subscription lookup fails.
export const showPayingParentSetup = (isManaging: boolean, hasActiveArrangement: boolean): boolean =>
  isManaging && !hasActiveArrangement;

// Payout setup (Connect) and its confirm-account note only show to the receiving
// parent who has not finished payout setup. Once status is complete or under
// review, only the matching status message is shown. A failed Stripe lookup
// must not reopen setup when the stored status already says setup started or finished.
export const showReceiverPayoutSetup = (isViewing: boolean, connectStatus: string): boolean =>
  isViewing && (connectStatus === "not_created" || connectStatus === "pending");

// Payer arrangement actions (history and manage) follow the stored arrangement,
// not whether a live Stripe card list succeeded.
export const showPayerArrangementActions = (isManaging: boolean, hasActiveArrangement: boolean): boolean =>
  isManaging && hasActiveArrangement;
