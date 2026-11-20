import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p: string) => readFileSync(join(root, p), "utf8");

// There is no calendar page in the product. /calendar used to show the in-app 404.
describe("/calendar opens Home", () => {
  it("redirects /calendar to the dashboard", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('path="/calendar"');
    expect(app).toContain('<QueryRedirect to="/dashboard" />');
    expect(app).not.toMatch(/path="\/calendar"[^>]*>\s*<NotFound/);
  });

  it("has no calendar page and no other /calendar links in the website", () => {
    const src = [
      "src/App.tsx",
      "src/pages/Dashboard.tsx",
      "src/components/dashboard/HomeTab.tsx",
      "src/components/layout/BottomNav.tsx",
    ].map(read).join("\n");
    expect(src).not.toMatch(/to="\/calendar"|href="\/calendar"|navigate\("\/calendar"\)/);
  });
});
