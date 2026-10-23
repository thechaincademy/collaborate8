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