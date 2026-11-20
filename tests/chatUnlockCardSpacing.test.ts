import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

// The bottom tab bar on the website is h-20 (5rem) plus pb-safe, in the layout rather than
// over the content. The main area scrolls above it, on every phone width (320 to 430).
describe("unlock card clears the bottom tab bar", () => {
  it("the tab bar is 5rem plus the safe area and is not fixed over the page", () => {
    const nav = read("src/components/layout/BottomNav.tsx");
    expect(nav).not.toContain("fixed bottom-0");
    expect(nav).toContain("h-20");
    expect(nav).toContain("pb-safe");
  });
  it("the dashboard scrollport ends above the tab bar", () => {
    const layout = read("src/components/layout/MobileLayout.tsx");
    expect(layout).toContain("h-dvh");
    expect(layout).toContain("min-h-0 flex-1 overflow-y-auto");
    expect(layout).not.toContain("fixed bottom-0");
  });
  it("the not-connected chat screen adds its own bottom space and the card keeps a scroll margin", () => {
    const chat = read("src/components/dashboard/ChatTab.tsx");
    const start = chat.indexOf("if (!coparentId) {");
    const block = chat.slice(start, chat.indexOf("unconnected-unlock-card", start) + 200);
    expect(block).toContain("pb-[calc(3rem+env(safe-area-inset-bottom))]");
    expect(block).toContain("scroll-mb-[calc(7rem+env(safe-area-inset-bottom))]");
  });
});
