import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const googleScript = html.split("<!-- Google Consent Mode v2:")[1]?.match(/<script>([\s\S]*?)<\/script>/)?.[1];

const setup = (choice: string | null) => {
  const scripts: unknown[] = [];
  const storage = new Map<string, string>();
  if (choice) storage.set("medi8-cookie-consent", choice);
  const context: any = {
    document: { createElement: () => ({}), head: { appendChild: (s: unknown) => scripts.push(s) } },
    localStorage: { getItem: (k: string) => storage.get(k) ?? null },
    c8LoadHotjar: () => {},
    addEventListener: () => {},
  };
  context.window = context;
  if (!googleScript) throw new Error("Google consent script missing");
  runInNewContext(googleScript, context);
  return { context, storage, scripts, commands: () => context.dataLayer.map((a: unknown) => Array.from(a as ArrayLike<unknown>)) };
};

const signals = (state: string) => ({
  analytics_storage: state, ad_storage: state,
  ad_user_data: state, ad_personalization: state,
});

describe("Google Consent Mode v2", () => {
  it("defaults all four signals to denied and loads one shared script before choice", () => {
    const { commands, context, scripts } = setup(null);
    expect(commands()[0]).toEqual(["consent", "default", signals("denied")]);
    expect(commands()[1]).toEqual(["consent", "update", signals("denied")]);
    expect(commands()).toContainEqual(["config", "AW-18435476721"]);
    expect(commands()).toContainEqual(["config", "G-2YB8M4ZYEG", { send_page_view: false }]);
    context.c8LoadGtag();
    expect(scripts).toHaveLength(1);
  });

  it("Accept grants all four and Reject restores denied", () => {
    const { context, storage, commands } = setup(null);
    storage.set("medi8-cookie-consent", "accepted");
    context.c8UpdateGoogleConsent();
    expect(commands().at(-1)).toEqual(["consent", "update", signals("granted")]);
    storage.set("medi8-cookie-consent", "declined");
    context.c8UpdateGoogleConsent();
    expect(commands().at(-1)).toEqual(["consent", "update", signals("denied")]);
  });

  it("restores accepted and rejected choices on later visits", () => {
    expect(setup("accepted").commands()[1]).toEqual(["consent", "update", signals("granted")]);
    expect(setup("declined").commands()[1]).toEqual(["consent", "update", signals("denied")]);
  });
});