import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_AUTH_WAIT_MS, ADMIN_LOGIN_PATH, adminLoginHref, confirmAuthKind, isAdminPath, redirectToAdminLogin, safeAdminNext } from "../src/lib/adminAuth";
import { ADMIN_STORAGE_KEY, appStorageKey, clearAuthStorage, signOutAndClear } from "../src/lib/authStorage";

const root = join(import.meta.dirname, "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("admin path helpers", () => {
  it("treats only /admin and /admin/* as admin paths", () => {
    expect(isAdminPath("/admin")).toBe(true);
    expect(isAdminPath("/admin/access-requests")).toBe(true);
    expect(isAdminPath("/admin/login")).toBe(true);
    expect(isAdminPath("/dashboard")).toBe(false);
    expect(isAdminPath("/dsl")).toBe(false);
    expect(isAdminPath("/login")).toBe(false);
    expect(isAdminPath("/administration")).toBe(false);
  });

  it("only allows a same-site admin next path", () => {
    expect(safeAdminNext("/admin/access-requests")).toBe("/admin/access-requests");
    expect(safeAdminNext("/admin/access-requests?id=1&action=approve")).toBe("/admin/access-requests?id=1&action=approve");
    expect(safeAdminNext("/dashboard")).toBe("/admin");
    expect(safeAdminNext("https://evil.example/admin")).toBe("/admin");
    expect(safeAdminNext("//evil.example")).toBe("/admin");
    expect(safeAdminNext(null)).toBe("/admin");
  });

  it("builds a founder login link and picks the right confirm client", () => {
    expect(adminLoginHref("/admin/access-requests")).toBe("/admin/login?next=%2Fadmin%2Faccess-requests");
    expect(confirmAuthKind("/admin/access-requests")).toBe("admin");
    expect(confirmAuthKind("/admin")).toBe("admin");
    expect(confirmAuthKind("/dashboard")).toBe("app");
    expect(confirmAuthKind("/auth/confirm")).toBe("app");
  });

  it("sends sign-out to /admin/login with no next, so the form cannot bounce back into /admin", () => {
    expect(ADMIN_LOGIN_PATH).toBe("/admin/login");
    expect(ADMIN_AUTH_WAIT_MS).toBe(5000);
    const hrefs: string[] = [];
    (globalThis as { window?: unknown }).window = { location: { assign: (h: string) => hrefs.push(h) } };
    redirectToAdminLogin();
    expect(hrefs).toEqual(["/admin/login"]);
    delete (globalThis as { window?: unknown }).window;
  });
});

describe("session storage and sign-out", () => {
  it("uses a separate storage key from the parent app session", () => {
    expect(ADMIN_STORAGE_KEY).toBe("c8-admin-auth");
    expect(appStorageKey("https://byrwtxdalhsmvktuzoya.supabase.co")).toBe("sb-byrwtxdalhsmvktuzoya-auth-token");
    expect(appStorageKey("https://byrwtxdalhsmvktuzoya.supabase.co")).not.toBe(ADMIN_STORAGE_KEY);
  });

  it("clears the storage key and nearby supabase variants", () => {
    const store: Record<string, string> = {
      "c8-admin-auth": "session",
      "c8-admin-auth.0": "chunk",
      "sb-byrwtxdalhsmvktuzoya-auth-token": "parent",
      "other": "keep",
    };
    const ls = {
      get length() { return Object.keys(store).length; },
      key(i: number) { return Object.keys(store)[i] ?? null; },
      removeItem(k: string) { delete store[k]; },
    };
    (globalThis as { window?: unknown }).window = { localStorage: ls };
    clearAuthStorage("c8-admin-auth");
    expect(store).toEqual({ "sb-byrwtxdalhsmvktuzoya-auth-token": "parent", other: "keep" });
    delete (globalThis as { window?: unknown }).window;
  });

  it("signs out with local scope and still clears storage if signOut throws", async () => {
    const store: Record<string, string> = { "c8-admin-auth": "session" };
    (globalThis as { window?: unknown }).window = {
      localStorage: {
        get length() { return Object.keys(store).length; },
        key(i: number) { return Object.keys(store)[i] ?? null; },
        removeItem(k: string) { delete store[k]; },
      },
    };
    const throwing = { auth: { signOut: async () => { throw new Error("already signed out"); } } };
    await signOutAndClear(throwing, "c8-admin-auth");
    expect(store).toEqual({});

    let scope: unknown;
    store["c8-admin-auth"] = "session";
    const ok = { auth: { signOut: async (opts?: { scope?: string }) => { scope = opts?.scope; } } };
    await signOutAndClear(ok, "c8-admin-auth");
    expect(scope).toBe("local");
    expect(store).toEqual({});
    delete (globalThis as { window?: unknown }).window;
  });
});

describe("wiring", () => {
  it("creates an admin client with its own storage key and no URL session detection", () => {
    const src = read("src/integrations/supabase/adminClient.ts");
    expect(src).toContain('storageKey: ADMIN_STORAGE_KEY');
    expect(src).toContain("detectSessionInUrl: false");
    expect(src).toContain("createClient");
  });

  it("admin login, confirm and API calls use the admin client, not the parent session", () => {
    const login = read("src/pages/AdminLogin.tsx");
    expect(login).toContain("supabaseAdmin.auth.signInWithOtp");
    expect(login).toContain("useAdminAuth");
    expect(login).not.toContain('from "@/integrations/supabase/client"');

    const confirm = read("src/pages/AuthConfirm.tsx");
    expect(confirm).toContain("confirmAuthKind(params.next) === \"admin\" ? supabaseAdmin : supabase");

    const setup = read("src/pages/AdminSetup.tsx");
    expect(setup).toContain("useAdminAuth");
    expect(setup).not.toContain('from "@/integrations/supabase/client"');

    for (const f of [
      "src/pages/AdminAccessRequests.tsx",
      "src/pages/AdminDashboard.tsx",
      "src/pages/AdminAnalytics.tsx",
      "src/pages/AdminMonitoring.tsx",
      "src/components/admin/useSystemHealth.ts",
      "src/components/admin/SettingsEditor.tsx",
      "src/components/admin/AnalyticsConnections.tsx",
    ]) {
      const src = read(f);
      expect(src, f).toContain("supabaseAdmin");
      expect(src, f).not.toContain('from "@/integrations/supabase/client"');
    }
  });

  it("a missing admin session is sent to /admin/login, even if a parent is signed in", () => {
    const gate = read("src/components/admin/RequireAdminAuth.tsx");
    expect(gate).toContain("useAdminAuth");
    expect(gate).toContain("adminLoginHref");
    expect(gate).toContain("Navigate");
    const app = read("src/App.tsx");
    expect(app).toContain("RequireAdminAuth");
    expect(app).toContain("AdminAuthProvider");
    expect(app).toContain('path="/admin/login"');
    expect(app).toContain('path="/admin/access-requests"');
  });

  it("admin pages have an error boundary and a sign-in fallback, never a blank screen", () => {
    const boundary = read("src/components/admin/AdminErrorBoundary.tsx");
    expect(boundary).toContain("This page could not load");
    expect(boundary).toContain("Sign in to admin");
    expect(boundary).toContain("adminLoginHref");
    expect(read("src/App.tsx")).toContain("AdminErrorBoundary");
    for (const f of [
      "src/pages/AdminAccessRequests.tsx",
      "src/pages/AdminDashboard.tsx",
      "src/pages/AdminAnalytics.tsx",
      "src/pages/AdminMonitoring.tsx",
      "src/pages/AdminSetup.tsx",
    ]) {
      const src = read(f);
      expect(src, f).toMatch(/Sign in (to admin|with founder email)/);
    }
  });

  it("admin sign-out is local, clears the admin storage key, and redirects to founder login", () => {
    const hook = read("src/hooks/useAdminAuth.tsx");
    expect(hook).toContain("signOutAndClear(supabaseAdmin, ADMIN_STORAGE_KEY)");
    expect(hook).toContain("ADMIN_AUTH_WAIT_MS");
    expect(hook).toContain("setLoading(false)");
    expect(read("src/lib/authStorage.ts")).toContain('scope: "local"');
    const layout = read("src/components/admin/AdminLayout.tsx");
    expect(layout).toContain("redirectToAdminLogin()");
    expect(layout).not.toContain("adminLoginHref(\"/admin\")");
    expect(layout).toContain("isAdminPath");
    expect(layout).toContain(".call(client,");
    expect(layout).not.toMatch(/const rpc = client\.rpc/);

    // Safeguarding stays on the app session.
    expect(layout).toContain("useAuth");
    const appAuth = read("src/hooks/useAuth.tsx");
    expect(appAuth).toContain("signOutAndClear");
    expect(appAuth).toContain("appStorageKey");
    const dashboard = read("src/pages/AdminDashboard.tsx");
    expect(dashboard).toContain("redirectToAdminLogin()");
    expect(dashboard).toContain("Sign out");
    expect(dashboard).not.toMatch(/onClick=\{signOut\}/);
  });

  it("admin auth loading times out after 5 seconds and falls back to a sign-in link", () => {
    const loading = read("src/components/admin/AdminLoading.tsx");
    expect(loading).toContain("ADMIN_AUTH_WAIT_MS");
    expect(loading).toContain("Sign in to admin");
    expect(loading).toContain("ADMIN_LOGIN_PATH");
    const login = read("src/pages/AdminLogin.tsx");
    expect(login).toContain("ADMIN_AUTH_WAIT_MS");
    expect(login).toContain("if (user && !loading)");
    expect(login).toContain("if (loading && !waited)");
    expect(login).toContain("AdminLoading");
    const gate = read("src/components/admin/RequireAdminAuth.tsx");
    expect(gate).toContain("AdminLoading");
    for (const f of [
      "src/pages/AdminAccessRequests.tsx",
      "src/pages/AdminDashboard.tsx",
      "src/pages/AdminAnalytics.tsx",
      "src/pages/AdminMonitoring.tsx",
      "src/pages/AdminSetup.tsx",
    ]) {
      const src = read(f);
      expect(src, f).toContain("AdminLoading");
    }
    expect(existsSync(join(root, "src/components/admin/AdminLoading.tsx"))).toBe(true);
  });

  it("the default app client does not pick up sessions on /admin URLs", () => {
    const src = read("src/integrations/supabase/client.ts");
    expect(src).toContain("detectSessionInUrl");
    expect(src).toContain("/admin");
  });

  it("required files exist", () => {
    for (const f of [
      "src/integrations/supabase/adminClient.ts",
      "src/hooks/useAdminAuth.tsx",
      "src/lib/adminAuth.ts",
      "src/lib/authStorage.ts",
      "src/components/admin/RequireAdminAuth.tsx",
      "src/components/admin/AdminErrorBoundary.tsx",
      "src/components/admin/AdminLoading.tsx",
    ]) expect(existsSync(join(root, f)), f).toBe(true);
  });
});
