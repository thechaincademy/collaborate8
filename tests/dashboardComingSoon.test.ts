import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import {
  COMING_SOON_TABS,
  VALID_TABS,
  activeDashboardTab,
  isComingSoonTab,
  isValidDashboardTabParam,
  requestedDashboardTab,
} from "../src/lib/dashboardTab";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

describe("Benefits Coming soon modal on the website", () => {
  it("treats benefits as a real tab that is coming soon", () => {
    expect(VALID_TABS).toContain("benefits");
    expect(COMING_SOON_TABS).toEqual(["benefits"]);
    expect(isValidDashboardTabParam("benefits")).toBe(true);
    expect(requestedDashboardTab("benefits")).toBe("benefits");
  });

  it("keeps Benefits selected on the website so the Coming soon modal can show", () => {
    expect(activeDashboardTab("benefits", false)).toBe("benefits");
    expect(isComingSoonTab("benefits", false)).toBe(true);
    expect(activeDashboardTab(null, false)).toBe("home");
    expect(isComingSoonTab("home", false)).toBe(false);
  });

  it("falls back to Home inside the app and does not show the modal there", () => {
    expect(activeDashboardTab("benefits", true)).toBe("home");
    expect(isComingSoonTab("benefits", true)).toBe(false);
    expect(isComingSoonTab("home", true)).toBe(false);
  });

  it("still lists Benefits in the website nav", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain('label: "Benefits"');
    expect(nav).toContain('tab: "benefits"');
  });

  it("the dashboard shows ComingSoonOverlay for coming soon tabs on the website only", () => {
    const dashboard = read("src/pages/Dashboard.tsx");
    expect(dashboard).toContain("isComingSoonTab(activeTab, inApp)");
    expect(dashboard).toContain("ComingSoonOverlay");
    expect(dashboard).toContain("<BenefitsTab />");
    const overlay = read("src/components/dashboard/ComingSoonOverlay.tsx");
    expect(overlay).toContain("Coming soon");
    expect(overlay).toContain("Back to Home");
    expect(overlay).toContain('role="dialog"');
  });
});
