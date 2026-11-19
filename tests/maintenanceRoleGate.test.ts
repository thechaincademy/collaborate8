import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { maintenanceRoleGate } from "../src/lib/maintenanceOnboarding";

const base = { localConfirmed: false, role: "managing", hasOwnArrangement: false, cardCount: 0, connectStatus: "not_created", evidenceLoading: false };

describe("Maintenance role picker comes back only when the role is really unknown", () => {
  it("this browser's flag still confirms", () => expect(maintenanceRoleGate({ ...base, localConfirmed: true })).toBe("confirmed"));
  it("paying parent with a live arrangement on a new browser is not asked again (uk1)", () =>
    expect(maintenanceRoleGate({ ...base, hasOwnArrangement: true })).toBe("confirmed"));
  it("paying parent with a saved card is not asked again", () => expect(maintenanceRoleGate({ ...base, cardCount: 1 })).toBe("confirmed"));
  it("receiving parent with Stripe payouts started is not asked again (uk2)", () => {
    for (const s of ["pending", "pending_capabilities", "complete"])
      expect(maintenanceRoleGate({ ...base, role: "viewing", connectStatus: s })).toBe("confirmed");
  });
  it("evidence must match the saved role", () => {
    expect(maintenanceRoleGate({ ...base, role: "managing", connectStatus: "complete" })).toBe("picker");
    expect(maintenanceRoleGate({ ...base, role: "viewing", hasOwnArrangement: true, cardCount: 1 })).toBe("picker");
  });
  it("new parent with nothing set up still sees the picker", () => {
    expect(maintenanceRoleGate(base)).toBe("picker");
    expect(maintenanceRoleGate({ ...base, role: "viewing" })).toBe("picker");
  });
  it("waits for account data instead of flashing the picker", () =>
    expect(maintenanceRoleGate({ ...base, connectStatus: "loading", evidenceLoading: true })).toBe("loading"));
  it("the Maintenance tab uses the gate and keeps Go back working", () => {
    const src = readFileSync(new URL("../src/components/dashboard/MaintenanceTab.tsx", import.meta.url), "utf8");
    expect(src).toContain("maintenanceRoleGate({");
    expect(src).toContain('goBackRequested && !localRoleConfirmed');
    expect(src).not.toContain("setRoleConfirmed(");
  });
});
