import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

// The bottom tab bar on the website is h-20 (5rem) plus pb-safe. Content under it must end
// at least that far from the bottom, on every phone width (320 to 430) and with a home bar.
describe("unlock card clears the bottom tab bar", () => {
  it("the tab bar is 5rem plus the safe area", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).toContain("fixed bottom-0");
    expect(nav).toContain("h-20");
    expect(nav).toContain("pb-safe");
  });
  it("the dashboard leaves 6rem plus the safe area under the content on the website", () => {
    expect(read("src/components/layout/MobileLayout.tsx")).toContain('"pb-[calc(6rem+env(safe-area-inset-bottom))]"');
  });
  it("the not-connected chat screen adds its own bottom space and the card keeps a scroll margin", () => {
    const chat = read("src/components/dashboard/ChatTab.tsx");
    const start = chat.indexOf("if (!coparentId) {");
    const block = chat.slice(start, chat.indexOf("unconnected-unlock-card", start) + 200);
    expect(block).toContain("pb-[calc(3rem+env(safe-area-inset-bottom))]");
    expect(block).toContain("scroll-mb-[calc(7rem+env(safe-area-inset-bottom))]");
  });
});
