import { afterEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  LIVE_PREMIUM_PRICE_ID,
  LIVE_PREMIUM_PRODUCT_ID,
  isConversationToolSubscription,
  premiumPriceId,
  premiumProductId,
  stripeIdFromEnv,
} from "../supabase/functions/_shared/conversation-tool-access-rule";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const KEYS = ["STRIPE_PREMIUM_PRICE_ID", "STRIPE_PREMIUM_PRODUCT_ID", "STRIPE_MAINTENANCE_PRODUCT_ID"];
afterEach(() => KEYS.forEach((k) => delete process.env[k]));

describe("Stripe ids: live by default, sandbox by secret", () => {
  test("unset secrets give the live ids", () => {
    expect(premiumPriceId()).toBe("price_1UTKxlCN8qgG26mrUCWqWllx");
    expect(premiumProductId()).toBe("prod_VFe3hx29MYgCMR");
    expect(stripeIdFromEnv("STRIPE_MAINTENANCE_PRODUCT_ID", "prod_V2EZcZyjIL8IDn")).toBe("prod_V2EZcZyjIL8IDn");
  });
  test("blank secrets also give the live ids", () => {
    process.env.STRIPE_PREMIUM_PRICE_ID = "  ";
    expect(premiumPriceId()).toBe(LIVE_PREMIUM_PRICE_ID);
  });
  test("set secrets override", () => {
    process.env.STRIPE_PREMIUM_PRICE_ID = "price_sbx";
    process.env.STRIPE_PREMIUM_PRODUCT_ID = "prod_sbx";
    process.env.STRIPE_MAINTENANCE_PRODUCT_ID = "prod_maint_sbx";
    expect(premiumPriceId()).toBe("price_sbx");
    expect(premiumProductId()).toBe("prod_sbx");
    expect(stripeIdFromEnv("STRIPE_MAINTENANCE_PRODUCT_ID", "x")).toBe("prod_maint_sbx");
  });
  test("webhook matching honours the sandbox ids and still knows the live ones", () => {
    process.env.STRIPE_PREMIUM_PRICE_ID = "price_sbx";
    process.env.STRIPE_PREMIUM_PRODUCT_ID = "prod_sbx";
    const sub = (price: string, product: string) => ({ metadata: {}, items: { data: [{ price: { id: price, product } }] } });
    expect(isConversationToolSubscription(sub("price_sbx", "prod_other"))).toBe(true);
    expect(isConversationToolSubscription(sub("price_other", "prod_sbx"))).toBe(true);
    expect(isConversationToolSubscription(sub(LIVE_PREMIUM_PRICE_ID, "x"))).toBe(true);
    expect(isConversationToolSubscription(sub("price_maint", "prod_maint"))).toBe(false);
  });
  test("functions read ids through the override, with no other hardcoded Stripe ids", () => {
    const subs = read("supabase/functions/stripe-subscriptions/index.ts");
    expect(subs).toContain('stripeIdFromEnv("STRIPE_MAINTENANCE_PRODUCT_ID", LIVE_MAINTENANCE_PRODUCT_ID)');
    expect(read("supabase/functions/conversation-tool-access/index.ts")).toContain("price: premiumPriceId()");
    for (const f of ["stripe-subscriptions/index.ts", "conversation-tool-access/index.ts", "stripe-webhooks/index.ts", "stripe-connect/index.ts"]) {
      const src = read(`supabase/functions/${f}`).replace(/LIVE_[A-Z_]+ = "[^"]+"/g, "");
      expect(src).not.toMatch(/"(prod|price)_[A-Za-z0-9]{8,}"/);
    }
  });
});
