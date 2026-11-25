import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const chat = readFileSync(join(root, "src/components/dashboard/ChatTab.tsx"), "utf8");

// With the keyboard open on a phone the tab bar is covered and the header can scroll away.
// The chat keeps its own sticky Back to Home control so there is always a way out.
describe("chat always has a way back to Home", () => {
  it("defines a sticky Back to Home bar that goes to the dashboard Home tab", () => {
    const start = chat.indexOf("const BackToHomeBar");
    expect(start).toBeGreaterThan(0);
    const block = chat.slice(start, chat.indexOf("const ChatTab = ", start));
    expect(block).toContain("sticky top-0");
    expect(block).toContain('aria-label="Back to Home"');
    expect(block).toContain("h-11"); // 44px tap target
    expect(chat).toContain('navigate("/dashboard")');
  });
  it("is shown on the chat, documents and rewrite-suggestion screens", () => {
    expect(chat.match(/<BackToHomeBar /g)?.length).toBe(3);
  });
  it("the main chat view puts the bar above the header on small and large phones", () => {
    const i = chat.indexOf('offset={compact ? "pt4" : "pt12"}');
    expect(i).toBeGreaterThan(0);
    expect(chat.slice(i - 200, i)).toContain("BackToHomeBar");
  });
});
