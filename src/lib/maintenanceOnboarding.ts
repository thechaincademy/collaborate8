export type MaintenanceOnboardingStep =
  | "setup-card"
  | "receiving-question"
  | "setup-connect"
  | "payment-amount"
  | "payment-frequency"
  | "complete"
  | "waiting-coparent";

// Invited signup assigns viewing automatically, so confirm payment direction locally.
export const initialMaintenanceStep = (role?: string): MaintenanceOnboardingStep =>
  role === "managing" ? "setup-card" : "receiving-question";

export const maintenanceReceivingAnswer = (receiving: boolean): MaintenanceOnboardingStep =>
  receiving ? "setup-connect" : "waiting-coparent";

export const afterMaintenanceCard = (): MaintenanceOnboardingStep => "payment-amount";