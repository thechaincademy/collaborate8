import { describe, it, expect, beforeEach } from "bun:test";

// Tests the GA4 page_view rules in src/lib/ga4.ts:
// consent gating, one send per URL, landing URL (with UTM query) on first hit,
// and that withdrawing consent stops further sends.

const LANDING = "https://collaborate8.com/?utm_source=leaflet&utm_campaign=hackney";

let gtagCalls: unknown[][];

const setupDom = (href: string) => {
  gtagCalls = [];
  const storage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  };
  (globalThis as any).window = {
    location: { href },
    gtag: (...args: unknown[]) => gtagCalls.push(args),
  };
};

// Fresh module instance per test (module captures landing URL + send state at load)
const loadModule = async (n: number) => import(`../src/lib/ga4.ts?case=${n}`);

const accept = () => localStorage.setItem("medi8-cookie-consent", "accepted");

describe("sendGa4PageView", () => {
  beforeEach(() => setupDom(LANDING));

  it("sends nothing before consent", async () => {
    const { sendGa4PageView } = await loadModule(1);
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(0);
  });

  it("sends nothing when consent is Essential Only (declined)", async () => {
    localStorage.setItem("medi8-cookie-consent", "declined");
    const { sendGa4PageView } = await loadModule(2);
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(0);
  });

  it("first page_view uses the landing URL with its UTM query string", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(3);
    // Simulate the router having stripped the query before the first send
    (globalThis as any).window.location.href = "https://collaborate8.com/";
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0][1]).toBe("page_view");
    expect((gtagCalls[0][2] as any).page_location).toBe(LANDING);
    expect((gtagCalls[0][2] as any).send_to).toBe("G-QLHPHSQVJJ");
  });

  it("does not double-send the same URL (StrictMode double effect)", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(4);
    sendGa4PageView();
    sendGa4PageView();
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(1);
  });

  it("sends exactly one page_view per route change", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(5);
    sendGa4PageView(); // landing
    sendGa4PageView("https://collaborate8.com/faq");
    sendGa4PageView("https://collaborate8.com/faq"); // repeat render, ignored
    sendGa4PageView("https://collaborate8.com/about");
    expect(gtagCalls).toHaveLength(3);
    expect((gtagCalls[1][2] as any).page_location).toBe("https://collaborate8.com/faq");
    expect((gtagCalls[2][2] as any).page_location).toBe("https://collaborate8.com/about");
  });

  it("stops sending when consent is withdrawn", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(6);
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(1);
    localStorage.setItem("medi8-cookie-consent", "declined");
    sendGa4PageView("https://collaborate8.com/faq");
    expect(gtagCalls).toHaveLength(1);
  });

  it("sends nothing if gtag is not loaded", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(7);
    delete (globalThis as any).window.gtag;
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(0);
  });
});
