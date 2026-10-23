import { describe, expect, it } from "bun:test";
import { afterMaintenanceCard, initialMaintenanceStep, maintenancePayerAction, maintenanceReceivingAnswer } from "../src/lib/maintenanceOnboarding";

describe("Maintenance onboarding before Stripe", () => {
  it("asks automatically assigned viewing parents whether they receive maintenance", () => {
    expect(initialMaintenanceStep("viewing")).toBe("receiving-question");
  });
  it("asks when the payment role is unknown", () => {
    expect(initialMaintenanceStep()).toBe("receiving-question");
  });
  it("shows the explanation for Yes", () => {
    expect(maintenanceReceivingAnswer(true)).toBe("setup-connect");
  });
  it("shows the payer explanation for No rather than silently skipping", () => {
    expect(maintenanceReceivingAnswer(false)).toBe("payer-explainer");
  });
  it("opens the existing card step for Add payment method, never Connect", () => {
    expect(maintenancePayerAction(true)).toBe("setup-card");
  });
  it("continues onboarding for Do this later", () => {
    expect(maintenancePayerAction(false)).toBe("waiting-coparent");
  });
  it("allows invited payers to skip card setup without setting a receiver arrangement", () => {
    expect(afterMaintenanceCard(true)).toBe("waiting-coparent");
  });
  it("keeps the payer card step and then skips Connect", () => {
    expect(initialMaintenanceStep("managing")).toBe("setup-card");
    expect(afterMaintenanceCard()).toBe("payment-amount");
  });
});