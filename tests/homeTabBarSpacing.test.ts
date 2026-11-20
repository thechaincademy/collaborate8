import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

// On a 390x844 phone the fixed tab bar used to cover the Financial Chat card on first
// load. The website tab bar now sits in the layout, and Home scrolls above it.
describe("Home content clears the bottom tab bar", () => {
  it("the website shell is a full-height column and main scrolls above the tab bar", () => {
    const layout = read("src/components/layout/MobileLayout.tsx");
    expect(layout).toContain("h-dvh");
    expect(layout).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(layout).toContain("<BottomNav");
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).not.toContain("fixed bottom-0");
    expect(nav).toContain("pb-safe");
    expect(nav).toContain("h-20");
  });

  it("Home still has the Financial Chat card", () => {
    const home = read("src/components/dashboard/HomeTab.tsx");
    expect(home).toContain("Financial Chat");
    expect(home).toContain("Open chat");
  });
});
