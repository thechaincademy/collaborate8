import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { forgotPasswordHref, loginErrorView, UPGRADE_LINE } from "../src/lib/loginError";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("sign-in error on the website", () => {
  it("a wrong password shows Supabase's message and the upgrade line", () => {
    for (const err of [{ message: "Invalid login credentials" }, { message: "", code: "invalid_credentials" }]) {
      const v = loginErrorView(err);
      expect(v?.kind).toBe("invalid_credentials");
      expect(v?.text).toContain("Invalid login credentials");
      expect(v && "upgrade" in v ? v.upgrade : "").toBe("We've upgraded Collabor8. If you used it before, please set a new password to continue.");
    }
  });
  it("other errors still show a visible message", () => {
    expect(loginErrorView({ message: "Email not confirmed" })?.kind).toBe("email_not_confirmed");
    expect(loginErrorView({ message: "Network down" })).toEqual({ kind: "other", text: "Network down" });
    expect(loginErrorView({ message: "" })?.text).toBe("We couldn't log you in. Please try again.");
    expect(loginErrorView(null)).toBeNull();
  });
  it("links to the forgot-password page with the email filled in", () => {
    expect(forgotPasswordHref(" sam@example.org ")).toBe("/forgot-password?email=sam%40example.org");
    expect(forgotPasswordHref("")).toBe("/forgot-password");
  });
  it("the sign-in page shows the error inline and never sends a reset itself", () => {
    const page = read("src/pages/Login.tsx");
    expect(page).toContain('role="alert"');
    expect(page).toContain("forgotPasswordHref(email)");
    expect(page).not.toContain("resetPasswordForEmail");
    const lib = read("src/lib/loginError.ts");
    expect(lib).not.toMatch(/supabase|resetPasswordForEmail/);
  });
  it("follows the copy rules", () => {
    for (const text of [UPGRADE_LINE, read("src/lib/loginError.ts"), read("src/pages/Login.tsx")]) {
      expect(text.includes("\u2014")).toBe(false);
      expect(/\bpolice\b|\bvictims?\b/i.test(text)).toBe(false);
    }
    expect(UPGRADE_LINE).toContain("Collabor8");
  });
});
