import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import {
  maintenanceRoleGate,
  maintenanceRoleSettled,
  resolveConnectStatus,
  showPayerArrangementActions,
  showPayingParentSetup,
  showReceiverPayoutSetup,
} from "../src/lib/maintenanceOnboarding";

const base = { localConfirmed: false, role: "managing", hasOwnArrangement: false, cardCount: 0, connectStatus: "not_created", evidenceLoading: false };

describe("Maintenance role picker comes back only when the role is really unknown", () => {
  it("this browser's flag still confirms", () => expect(maintenanceRoleGate({ ...base, localConfirmed: true })).toBe("confirmed"));
  it("paying parent with a live arrangement on a new browser is not asked again (uk1)", () =>
    expect(maintenanceRoleGate({ ...base, hasOwnArrangement: true })).toBe("confirmed"));
  it("receiving parent with a co-parent arrangement is not asked again, even if Stripe payout status failed (uk2)", () => {
    expect(maintenanceRoleGate({ ...base, role: "viewing", hasCoparentArrangement: true, connectStatus: "not_created" })).toBe("confirmed");
    expect(maintenanceRoleSettled({ ...base, role: "viewing", hasCoparentArrangement: true, connectStatus: "not_created" })).toBe(true);
  });
  it("a parent with an arrangement is never asked to pick a role again", () => {
    expect(maintenanceRoleGate({ ...base, role: "viewing", hasOwnArrangement: true })).toBe("confirmed");
    expect(maintenanceRoleGate({ ...base, role: "managing", hasCoparentArrangement: true })).toBe("confirmed");
  });
  it("paying parent with a saved card is not asked again", () => expect(maintenanceRoleGate({ ...base, cardCount: 1 })).toBe("confirmed"));
  it("receiving parent with Stripe payouts started is not asked again (uk2)", () => {
    for (const s of ["pending", "pending_capabilities", "complete"])
      expect(maintenanceRoleGate({ ...base, role: "viewing", connectStatus: s })).toBe("confirmed");
  });
  it("payout status alone does not confirm a paying parent", () => {
    expect(maintenanceRoleGate({ ...base, role: "managing", connectStatus: "complete" })).toBe("picker");
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
    expect(src).toContain("hasCoparentArrangement");
    expect(src).toContain("resolveConnectStatus(");
    expect(src).toContain("coparentArrangementLoading");
    expect(src).toContain('goBackRequested && !localRoleConfirmed');
    expect(src).not.toContain("setRoleConfirmed(");
  });

  it("a paying parent with an arrangement or a saved card has a settled role (uk1)", () => {
    expect(maintenanceRoleSettled({ ...base, hasOwnArrangement: true })).toBe(true);
    expect(maintenanceRoleSettled({ ...base, cardCount: 1 })).toBe(true);
    expect(maintenanceRoleSettled(base)).toBe(false);
  });

  it("a receiving parent who has started payouts has a settled role (uk2)", () => {
    expect(maintenanceRoleSettled({ ...base, role: "viewing", connectStatus: "complete" })).toBe(true);
    expect(maintenanceRoleSettled({ ...base, role: "viewing", connectStatus: "not_created" })).toBe(false);
  });

  it("the leftover receiving-parent link is hidden once the paying role is settled", () => {
    const src = readFileSync(new URL("../src/components/dashboard/MaintenanceTab.tsx", import.meta.url), "utf8");
    expect(src).toContain("maintenanceRoleSettled({");
    expect(src).toContain("showSwitchRoleLink");
    expect(src).toContain("Are you the receiving parent instead?");
    expect(src).toContain("{showSwitchRoleLink && (");
    const linkIdx = src.indexOf("Are you the receiving parent instead?");
    const gateIdx = src.lastIndexOf("{showSwitchRoleLink && (", linkIdx);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(linkIdx);
  });
});

describe("Failed Stripe lookups fall back to the stored role and payout status, not to setup", () => {
  it("uses the stored connected_accounts status when the live lookup is missing (uk2)", () => {
    expect(resolveConnectStatus(null, { onboarding_status: "complete" })).toBe("complete");
    expect(resolveConnectStatus({ status: "not_created" }, { onboarding_status: "complete" })).toBe("complete");
    expect(resolveConnectStatus({ status: "pending" }, { onboarding_status: "complete" })).toBe("pending");
    expect(resolveConnectStatus({ status: "not_created" }, null)).toBe("not_created");
    expect(resolveConnectStatus(null, null)).toBe("not_created");
  });

  it("the paying parent Connect form only shows when there is no live arrangement (uk1)", () => {
    expect(showPayingParentSetup(true, false)).toBe(true);
    expect(showPayingParentSetup(true, true)).toBe(false);
    expect(showPayingParentSetup(false, false)).toBe(false);
    expect(showPayingParentSetup(false, true)).toBe(false);
  });

  it("payout Connect only shows to a receiving parent who has not finished setup", () => {
    expect(showReceiverPayoutSetup(true, "not_created")).toBe(true);
    expect(showReceiverPayoutSetup(true, "pending")).toBe(true);
    expect(showReceiverPayoutSetup(true, "complete")).toBe(false);
    expect(showReceiverPayoutSetup(true, "pending_capabilities")).toBe(false);
    expect(showReceiverPayoutSetup(false, "not_created")).toBe(false);
  });

  it("payer arrangement actions follow the stored arrangement, not a live card list", () => {
    expect(showPayerArrangementActions(true, true)).toBe(true);
    expect(showPayerArrangementActions(true, false)).toBe(false);
    expect(showPayerArrangementActions(false, true)).toBe(false);
  });

  it("the Maintenance tab uses those helpers", () => {
    const src = readFileSync(new URL("../src/components/dashboard/MaintenanceTab.tsx", import.meta.url), "utf8");
    expect(src).toContain("showPayingParentSetup(");
    expect(src).toContain("showReceiverPayoutSetup(");
    expect(src).toContain("showPayerArrangementActions(");
    expect(src).toContain('from("connected_accounts")');
  });

  it("the add-bank-account note is hidden once payouts are enabled (uk2)", () => {
    expect(showReceiverPayoutSetup(true, "complete")).toBe(false);
    const src = readFileSync(new URL("../src/components/dashboard/MaintenanceTab.tsx", import.meta.url), "utf8");
    const note = "RECEIVER_COPY[receiverPayoutView(connectStatus)].body";
    const noteIdx = src.indexOf(note);
    const gateIdx = src.lastIndexOf("showReceiverPayoutSetup(", noteIdx);
    expect(noteIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(gateIdx).toBeLessThan(noteIdx);
    expect(noteIdx - gateIdx).toBeLessThan(700);
    const enabledIdx = src.indexOf("Payouts enabled - you can receive payments");
    expect(enabledIdx).toBeGreaterThan(noteIdx);
    const between = src.slice(gateIdx, enabledIdx);
    expect(between).toContain(note);
    expect(between).not.toContain("Payouts enabled - you can receive payments");
  });
});
