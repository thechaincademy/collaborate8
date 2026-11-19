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
// as confirmation too: a paying parent with an arrangement or a saved card, or a receiving
// parent who has started Stripe payouts. The evidence has to match the saved role, so a
// parent is never shown the wrong side.
export type MaintenanceRoleGate = "loading" | "picker" | "confirmed";

export interface MaintenanceRoleEvidence {
  localConfirmed: boolean;
  role?: string | null;
  hasOwnArrangement: boolean;
  cardCount: number;
  connectStatus: string; // loading | not_created | pending | pending_capabilities | complete
  evidenceLoading: boolean;
}

const STARTED_PAYOUTS = new Set(["pending", "pending_capabilities", "complete"]);

export const maintenanceRoleGate = (e: MaintenanceRoleEvidence): MaintenanceRoleGate => {
  if (e.localConfirmed) return "confirmed";
  if (e.role === "managing" && (e.hasOwnArrangement || e.cardCount > 0)) return "confirmed";
  if (e.role === "viewing" && STARTED_PAYOUTS.has(e.connectStatus)) return "confirmed";
  if (e.evidenceLoading) return "loading";
  return "picker";
};
