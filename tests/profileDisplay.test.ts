import { describe, expect, it } from "bun:test";
import { isDeletedProfile, otherPaymentPartyId, profileDisplayName } from "../src/lib/profileDisplay";

describe("Historical financial identities", () => {
  it("handles a null profile join without a blank name", () => {
    expect(profileDisplayName(null)).toBe("Deleted user");
    expect(isDeletedProfile("old-person", null)).toBe(true);
  });
  it("recognizes the deleted payer for a surviving receiver", () => {
    const id = otherPaymentPartyId({ payer_id: null, payee_id: "receiver" }, "receiver");
    expect(id).toBeNull();
    expect(isDeletedProfile(id)).toBe(true);
  });
  it("recognizes the deleted payee for a surviving payer", () => {
    const id = otherPaymentPartyId({ payer_id: "payer", payee_id: null }, "payer");
    expect(id).toBeNull();
    expect(isDeletedProfile(id)).toBe(true);
  });
  it("preserves surviving names and does not treat an unloaded join as deletion", () => {
    expect(profileDisplayName({ first_name: " Alex ", last_name: " Jones " })).toBe("Alex Jones");
    expect(isDeletedProfile("surviving-person", undefined)).toBe(false);
    expect(isDeletedProfile("surviving-person", { first_name: "Alex" })).toBe(false);
  });
});