import { beforeEach, describe, expect, it } from "bun:test";

const store = new Map<string, string>();
let replaced: string | null = null;
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};
const setUrl = (href: string) => {
  const u = new URL(href);
  (globalThis as any).window = {
    location: { href, pathname: u.pathname },
    history: { state: null, replaceState: (_s: unknown, _t: string, url: string) => { replaced = url; } },
  };
};
setUrl("https://collaborate8.com/");
const t = await import("../src/lib/internalTraffic");

describe("internal traffic", () => {
  beforeEach(() => { store.clear(); replaced = null; setUrl("https://collaborate8.com/"); });

  it("?c8_internal=1 marks the device and strips only that param", () => {
    setUrl("https://collaborate8.com/guide?utm_source=ig&c8_internal=1");
    expect(t.applyInternalUrlSwitch()).toBe("marked");
    expect(t.isInternalDevice()).toBe(true);
    expect(replaced).toBe("/guide?utm_source=ig");
  });

  it("?c8_internal=0 clears the device flag", () => {
    store.set("c8_internal", "1");
    setUrl("https://collaborate8.com/?c8_internal=0");
    expect(t.applyInternalUrlSwitch()).toBe("cleared");
    expect(t.isInternalDevice()).toBe(false);
  });

  it("no param leaves the URL and flag alone", () => {
    expect(t.applyInternalUrlSwitch()).toBeNull();
    expect(replaced).toBeNull();
  });

  it("team emails are internal, case-insensitive", () => {
    expect(t.isInternalEmail("Rafa@Collaborate8.com")).toBe(true);
    expect(t.isInternalEmail("jade@collaborate8.com")).toBe(true);
    expect(t.isInternalEmail("someone@collaborate8.com")).toBe(false);
  });

  it("QA bot emails are internal", () => {
    expect(t.isInternalEmail("collaborate8-qa-17@agentmail.to")).toBe(true);
    expect(t.isInternalEmail("qa-collaborate8@agentmail.to")).toBe(false);
    expect(t.isInternalEmail("collaborate8-qa@agentmail.co")).toBe(false);
  });

  it("is_test_account makes a user internal", () => {
    expect(t.isInternalUser({ email: "parent@example.com", isTestAccount: true })).toBe(true);
    expect(t.isInternalUser({ email: "parent@example.com", isTestAccount: false })).toBe(false);
  });

  it("marking persists the flag, admin paths count as internal", () => {
    t.markInternalDevice();
    expect(store.get("c8_internal")).toBe("1");
    t.clearInternalDevice();
    setUrl("https://collaborate8.com/admin");
    expect(t.isInternalTraffic()).toBe(true);
  });
});
