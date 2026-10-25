import { beforeEach, describe, expect, it } from "bun:test";

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  clear: () => store.clear(),
};
const { buildAttribution, captureAttribution, getAttribution } = await import("../src/lib/attribution");

describe("sign-up attribution", () => {
  beforeEach(() => localStorage.clear());

  it("reads utm values, referrer and landing path", () => {
    const a = buildAttribution("https://collaborate8.com/guide?utm_source=ig&utm_medium=social&utm_campaign=launch&utm_content=reel", "https://www.google.com/");
    expect(a).toEqual({ utm_source: "ig", utm_medium: "social", utm_campaign: "launch", utm_content: "reel", referrer: "https://www.google.com/", landing_page: "/guide" });
  });

  it("does not store without cookie consent", () => {
    captureAttribution();
    expect(localStorage.getItem("c8_attribution")).toBeNull();
  });

  it("first visit wins once consent is given", () => {
    localStorage.setItem("c8_attribution", JSON.stringify({ utm_source: "first" }));
    localStorage.setItem("medi8-cookie-consent", "accepted");
    captureAttribution();
    expect(getAttribution().utm_source).toBe("first");
  });
});
