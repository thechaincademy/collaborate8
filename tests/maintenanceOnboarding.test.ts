import { describe, expect, it } from "bun:test";
import { afterMaintenanceCard, initialMaintenanceStep, maintenanceReceivingAnswer } from "../src/lib/maintenanceOnboarding";

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
  it("continues without Connect for No", () => {
    expect(maintenanceReceivingAnswer(false)).toBe("waiting-coparent");
  });
  it("keeps the payer card step and then skips Connect", () => {
    expect(initialMaintenanceStep("managing")).toBe("setup-card");
    expect(afterMaintenanceCard()).toBe("payment-amount");
  });
});