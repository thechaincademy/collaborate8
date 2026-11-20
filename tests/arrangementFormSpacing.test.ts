import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");
const MARGIN = "scroll-mb-[calc(7rem+env(safe-area-inset-bottom))]";

// The website's bottom tab bar is h-20 (5rem) plus pb-safe. On phones (320 to 430 wide, with or
// without a home bar) the start date and Confirm arrangement must not end up under it, including
// when the browser scrolls a focused control into view.
describe("arrangement form clears the bottom tab bar", () => {
  it("the tab bar is 5rem plus the safe area and is not fixed over the page", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).not.toContain("fixed bottom-0");
    expect(nav).toContain("h-20");
    expect(nav).toContain("pb-safe");
  });

  it("the maintenance screen leaves 6rem plus the safe area under its content", () => {
    const tab = read("src/components/dashboard/MaintenanceTab.tsx");
    expect(tab).toContain('data-testid="maintenance-tab" className="px-6 pt-12 pb-[calc(6rem+env(safe-area-inset-bottom))]"');
  });

  it("start date, Continue and Confirm arrangement keep a scroll margin above the tab bar", () => {
    const form = read("src/components/dashboard/PayingParentSetup.tsx");
    const line = (needle: string) => form.split("\n").find((l) => l.includes(needle)) ?? "";
    expect(line('id="setup-start-date"')).toContain(MARGIN);
    expect(line("onClick={saveDetails}")).toContain(MARGIN);
    const confirm = line('data-testid="confirm-arrangement"');
    expect(confirm).toContain("Confirm arrangement");
    expect(confirm).toContain(MARGIN);
    expect(form).toContain('aria-label="Payment setup" className="pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]"');
  });
});
