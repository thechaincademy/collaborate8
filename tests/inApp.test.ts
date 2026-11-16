import { beforeEach, describe, expect, it } from "bun:test";

const store = new Map<string, string>();
let htmlClass = "";
let bodyClass = "";

const globals = globalThis as Record<string, unknown>;

const setEnv = (href: string, ua = "Mozilla/5.0") => {
  const u = new URL(href);
  globals.window = { location: { href, search: u.search } };
  globals.navigator = { userAgent: ua };
  globals.document = {
    documentElement: { classList: { contains: (c: string) => htmlClass.split(/\s+/).includes(c) } },
    body: { classList: { contains: (c: string) => bodyClass.split(/\s+/).includes(c) } },
  };
  globals.sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
  };
};

setEnv("https://collaborate8.com/");
const { isInApp } = await import("../src/lib/inApp");

describe("isInApp", () => {
  beforeEach(() => {
    store.clear();
    htmlClass = "";
    bodyClass = "";
    setEnv("https://collaborate8.com/");
  });

  it("is false in a normal browser", () => {
    expect(isInApp()).toBe(false);
    expect(store.size).toBe(0);
  });

  it("is true when the user agent contains Collabor8App", () => {
    setEnv("https://collaborate8.com/dashboard?tab=maintenance", "Mozilla/5.0 Collabor8App");
    expect(isInApp()).toBe(true);
    expect(store.has("c8-in-app")).toBe(false);
  });

  it("is true when html or body has c8-in-app", () => {
    htmlClass = "c8-in-app";
    expect(isInApp()).toBe(true);
    htmlClass = "";
    bodyClass = "c8-in-app";
    expect(isInApp()).toBe(true);
  });

  it("remembers ?app=1 for later navigations in the same tab", () => {
    setEnv("https://collaborate8.com/dashboard?tab=maintenance&app=1");
    expect(isInApp()).toBe(true);
    expect(store.get("c8-in-app")).toBe("1");

    setEnv("https://collaborate8.com/about");
    expect(isInApp()).toBe(true);
  });

  it("does not treat other app values as the in-app flag", () => {
    setEnv("https://collaborate8.com/?app=0");
    expect(isInApp()).toBe(false);
    setEnv("https://collaborate8.com/?app=true");
    expect(isInApp()).toBe(false);
  });
});
