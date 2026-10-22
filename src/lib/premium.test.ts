import { describe, expect, test } from "bun:test";
import { isPremiumRequired } from "./premium";
import { isActive } from "../../.lovable/pending/_shared.conversation-tool-access-rule";

const now = Date.parse("2026-10-22T15:39:00Z");
const future = "2027-10-22T15:39:00Z";
const past = "2025-10-22T15:39:00Z";

describe("Existing premium entitlement gates", () => {
  test("active subscribers can use premium features", () => expect(isActive({ subscription_status: "active", expires_at: past }, now)).toBe(true));
  test("trialing subscribers can use premium features", () => expect(isActive({ subscription_status: "trialing", expires_at: null }, now)).toBe(true));
  test("cancelled access lasts until paid year ends", () => expect(isActive({ subscription_status: "canceled", current_period_end: future, expires_at: future }, now)).toBe(true));
  test("cancelled access locks after paid year ends", () => expect(isActive({ subscription_status: "canceled", current_period_end: past, expires_at: past }, now)).toBe(false));
  test("expired promo access locks", () => expect(isActive({ source: "promo", expires_at: past }, now)).toBe(false));
  test("valid promo access unlocks", () => expect(isActive({ source: "promo", expires_at: future }, now)).toBe(true));
  test("no entitlement locks", () => expect(isActive(null, now)).toBe(false));
  test("explicit premium denial opens paywall", async () => expect(await isPremiumRequired({ error: "premium_required", feature: "rewrite" }, null)).toBe(true));
  test("HTTP 402 premium denial opens paywall", async () => expect(await isPremiumRequired(null, { context: new Response(JSON.stringify({ error: "premium_required", feature: "rewrite" }), { status: 402 }) })).toBe(true));
  test("AI credit 402 does not become subscription paywall", async () => expect(await isPremiumRequired(null, { context: new Response(JSON.stringify({ error: "AI credits have run out." }), { status: 402 }) })).toBe(false));
});