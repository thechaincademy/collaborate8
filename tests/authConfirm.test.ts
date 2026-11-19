import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  afterVerify,
  CONFIRM_STORAGE_KEY,
  confirmCopy,
  isExpiredOrUsed,
  otpType,
  parseConfirmParams,
  readConfirmParams,
  safeNextPath,
} from "../src/lib/authConfirm";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");
const HASH = "pkce_0123456789abcdef0123456789abcdef";

const memStore = (init: Record<string, string> = {}) => {
  const m = new Map(Object.entries(init));
  return { getItem: (k: string) => m.get(k) ?? null, removeItem: (k: string) => void m.delete(k), m };
};

describe("/auth/confirm link details", () => {
  it("reads token_hash, type and next from the link", () => {
    expect(parseConfirmParams(`?token_hash=${HASH}&type=recovery&next=%2Freset-password`)).toEqual({ tokenHash: HASH, type: "recovery", next: "/reset-password" });
    expect(parseConfirmParams(`?token_hash=${HASH}&type=magiclink&next=%2Fadmin%2Fanalytics`)?.next).toBe("/admin/analytics");
    expect(parseConfirmParams(`?token_hash=${HASH}&type=signup`)?.next).toBe("/dashboard");
  });

  it("refuses missing or odd values and off-site next paths", () => {
    expect(parseConfirmParams("")).toBeNull();
    expect(parseConfirmParams(`?token_hash=${HASH}`)).toBeNull();
    expect(parseConfirmParams(`?token_hash=${HASH}&type=reauthentication`)).toBeNull();
    expect(parseConfirmParams(`?token_hash=a%20b%3Cscript&type=recovery`)).toBeNull();
    for (const bad of ["https://evil.example.com", "//evil.example.com", "/\\evil.example.com", "javascript:alert(1)", "/x\n"]) {
      expect(safeNextPath(bad)).toBeNull();
      expect(parseConfirmParams(`?token_hash=${HASH}&type=signup&next=${encodeURIComponent(bad)}`)?.next).toBe("/dashboard");
    }
  });

  it("falls back to what index.html kept in sessionStorage, and ignores stale entries", () => {
    const now = 1_763_550_000_000;
    const kept = JSON.stringify({ token_hash: HASH, type: "recovery", next: "/reset-password", at: now - 60_000 });
    expect(readConfirmParams("", memStore({ [CONFIRM_STORAGE_KEY]: kept }), now)).toEqual({ tokenHash: HASH, type: "recovery", next: "/reset-password" });
    const stale = memStore({ [CONFIRM_STORAGE_KEY]: JSON.stringify({ token_hash: HASH, type: "recovery", at: now - 25 * 3600_000 }) });
    expect(readConfirmParams("", stale, now)).toBeNull();
    expect(stale.m.has(CONFIRM_STORAGE_KEY)).toBe(false);
    expect(readConfirmParams("", memStore({ [CONFIRM_STORAGE_KEY]: "not json" }), now)).toBeNull();
    expect(readConfirmParams("", null, now)).toBeNull();
  });
});

describe("/auth/confirm button and result", () => {
  it("one button per link type", () => {
    expect(confirmCopy("recovery").button).toBe("Set new password");
    for (const t of ["signup", "email_change", "invite"] as const) expect(confirmCopy(t).button).toBe("Confirm email");
    expect(confirmCopy("magiclink").button).toBe("Sign in");
    expect(confirmCopy("email").button).toBe("Sign in");
    expect(otpType("email")).toBe("magiclink");
  });

  it("recovery goes to /reset-password signed in; others go to next", () => {
    expect(afterVerify({ tokenHash: HASH, type: "recovery", next: "/dashboard" }, true)).toEqual({ kind: "navigate", to: "/reset-password" });
    expect(afterVerify({ tokenHash: HASH, type: "signup", next: "/dashboard" }, true)).toEqual({ kind: "navigate", to: "/dashboard" });
    expect(afterVerify({ tokenHash: HASH, type: "magiclink", next: "/admin/analytics" }, true)).toEqual({ kind: "navigate", to: "/admin/analytics" });
  });

  it("secure email change: the first of the two links confirms without a session", () => {
    expect(afterVerify({ tokenHash: HASH, type: "email_change", next: "/dashboard" }, false)).toEqual({ kind: "email_change_pending" });
    expect(afterVerify({ tokenHash: HASH, type: "email_change", next: "/dashboard" }, true)).toEqual({ kind: "navigate", to: "/dashboard" });
  });

  it("spots expired or used tokens", () => {
    expect(isExpiredOrUsed({ code: "otp_expired", status: 403, message: "Email link is invalid or has expired" })).toBe(true);
    expect(isExpiredOrUsed({ status: 403 })).toBe(true);
    expect(isExpiredOrUsed({ message: "Token has expired or is invalid" })).toBe(true);
    expect(isExpiredOrUsed({ status: 0, message: "Failed to fetch" })).toBe(false);
    expect(isExpiredOrUsed(null)).toBe(false);
  });
});

describe("/auth/confirm page wiring", () => {
  const page = read("src/pages/AuthConfirm.tsx");

  it("only verifies inside the button handler, never on load", () => {
    expect(page.match(/\.verifyOtp\(/g)?.length).toBe(1);
    const handler = page.slice(page.indexOf("const handleConfirm"), page.indexOf("const isRecovery"));
    expect(handler).toContain(".verifyOtp(");
    expect(page).not.toMatch(/useEffect/);
    expect(page).toContain("onClick={handleConfirm}");
  });

  it("is routed, and index.html moves the token out of the address bar before any tracker", () => {
    expect(read("src/App.tsx")).toContain('<Route path="/auth/confirm" element={<AuthConfirm />} />');
    const html = read("index.html");
    const strip = html.indexOf("c8_auth_confirm");
    expect(strip).toBeGreaterThan(0);
    for (const tracker of ["c8LoadHotjar", "c8LoadClarity", "googletagmanager"]) expect(strip).toBeLessThan(html.indexOf(tracker));
    expect(html).toContain(`sessionStorage.setItem('${CONFIRM_STORAGE_KEY}'`);
  });

  it("copy says Collabor8, with no em dashes", () => {
    for (const text of [page, read("src/lib/authConfirm.ts")]) {
      expect(text).not.toContain("\u2014");
      expect(text).not.toMatch(/Collaborate8\b/);
      expect(text).not.toMatch(/\bpolice\b|\bvictims?\b/i);
    }
    expect(page).toContain("This reset link has expired or has already been used. Please request a new one.");
    expect(page).toContain('"/forgot-password"');
  });
});
