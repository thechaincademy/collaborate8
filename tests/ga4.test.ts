import { describe, it, expect, beforeEach } from "bun:test";

// Tests the GA4 page_view rules in src/lib/ga4.ts:
// consent gating, one send per URL, landing URL (with UTM query) on first hit,
// the consented landing re-send after Accept (original URL + referrer, once
// per session), and that withdrawing consent stops further sends.

const LANDING = "https://collaborate8.com/?utm_source=nfm&utm_medium=referral&utm_campaign=nfm_partnership";
const REFERRER = "https://nfm.example/partners";

let gtagCalls: unknown[][];
let observers: Set<() => void>;
let frames: Map<number, FrameRequestCallback>;
let nextFrame = 0;
let consentAtSend: string[];
const fallback = async () => {
  const callbacks = [...frames.values()];
  frames.clear();
  callbacks.forEach(callback => callback(0));
  await Bun.sleep(330);
};
const updateTitle = (title: string) => {
  document.title = title;
  [...observers].forEach(callback => callback());
};

const setupDom = (href: string) => {
  gtagCalls = [];
  consentAtSend = [];
  observers = new Set();
  frames = new Map();
  (globalThis as any).document = { title: "About Us | Collabor8", head: {}, referrer: REFERRER };
  (globalThis as any).MutationObserver = class {
    constructor(private callback: () => void) {}
    observe() { observers.add(this.callback); }
    disconnect() { observers.delete(this.callback); }
  };
  (globalThis as any).requestAnimationFrame = (callback: FrameRequestCallback) => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  };
  (globalThis as any).cancelAnimationFrame = (id: number) => frames.delete(id);
  const storage = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => void storage.set(k, v),
    removeItem: (k: string) => void storage.delete(k),
  };
  const session = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => void session.set(k, v),
    removeItem: (k: string) => void session.delete(k),
  };
  (globalThis as any).window = {
    location: { href },
    gtag: (...args: unknown[]) => gtagCalls.push(args),
    c8UpdateGoogleConsent: () => consentAtSend.push(
      localStorage.getItem("medi8-cookie-consent") === "accepted" ? "granted" : "denied"
    ),
  };
};

// Fresh module instance per test (module captures landing URL + send state at load)
const loadModule = async (n: number) => import(`../src/lib/ga4.ts?case=${n}`);

const accept = () => localStorage.setItem("medi8-cookie-consent", "accepted");

describe("sendGa4PageView", () => {
  beforeEach(() => setupDom(LANDING));

  it("sends a cookieless visit before consent with denied signals", async () => {
    const { sendGa4PageView } = await loadModule(1);
    sendGa4PageView();
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    expect(consentAtSend).toEqual(["denied"]);
  });

  it("sends a cookieless visit when consent is Essential Only (declined)", async () => {
    localStorage.setItem("medi8-cookie-consent", "declined");
    const { sendGa4PageView } = await loadModule(2);
    sendGa4PageView();
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    expect(consentAtSend).toEqual(["denied"]);
  });

  it("first page_view uses the landing URL with its UTM query string", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(3);
    // Simulate the router having stripped the query before the first send
    (globalThis as any).window.location.href = "https://collaborate8.com/";
    sendGa4PageView();
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    expect(gtagCalls[0][1]).toBe("page_view");
    expect((gtagCalls[0][2] as any).page_location).toBe(LANDING);
    expect((gtagCalls[0][2] as any).send_to).toBe("G-2YB8M4ZYEG");
  });

  it("does not double-send the same URL (StrictMode double effect)", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(4);
    sendGa4PageView();
    sendGa4PageView();
    sendGa4PageView();
    await fallback();
    expect(gtagCalls).toHaveLength(1);
  });

  it("sends exactly one page_view per route change", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(5);
    sendGa4PageView(); // landing
    await fallback();
    sendGa4PageView("https://collaborate8.com/faq");
    sendGa4PageView("https://collaborate8.com/faq"); // repeat render, ignored
    updateTitle("FAQ | Collabor8");
    sendGa4PageView("https://collaborate8.com/about");
    updateTitle("About Us | Collabor8");
    expect(gtagCalls).toHaveLength(3);
    expect((gtagCalls[1][2] as any).page_location).toBe("https://collaborate8.com/faq");
    expect((gtagCalls[2][2] as any).page_location).toBe("https://collaborate8.com/about");
  });

  it("reverts to denied cookieless visits when consent is withdrawn", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(6);
    sendGa4PageView();
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    localStorage.setItem("medi8-cookie-consent", "declined");
    sendGa4PageView("https://collaborate8.com/faq");
    await fallback();
    expect(gtagCalls).toHaveLength(2);
    expect(consentAtSend).toEqual(["granted", "denied"]);
  });

  it("sends nothing if gtag is not loaded", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(7);
    delete (globalThis as any).window.gtag;
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(0);
  });

  it("takes the title after Helmet updates it", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(8);
    sendGa4PageView();
    await fallback();
    sendGa4PageView("https://collaborate8.com/faq");
    expect(gtagCalls).toHaveLength(1);
    updateTitle("FAQ | Collabor8");
    expect(gtagCalls).toHaveLength(2);
    expect((gtagCalls[1][2] as any).page_title).toBe("FAQ | Collabor8");
    expect((gtagCalls[1][2] as any).page_location).toBe("https://collaborate8.com/faq");
    await fallback();
    expect(gtagCalls).toHaveLength(2);
  });

  it("same-title fallback fires exactly once", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(9);
    sendGa4PageView();
    expect(gtagCalls).toHaveLength(0);
    await fallback();
    updateTitle("FAQ | Collabor8");
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    expect((gtagCalls[0][2] as any).page_title).toBe("About Us | Collabor8");
  });

  it("rapid navigation sends only the final route", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(10);
    sendGa4PageView();
    await fallback();
    const cancelFaq = sendGa4PageView("https://collaborate8.com/faq");
    sendGa4PageView("https://collaborate8.com/resources/child-maintenance-guide");
    cancelFaq(); // Stale effect cleanup must not cancel the newer route.
    updateTitle("Child Maintenance Guide | Collabor8");
    await fallback();
    expect(gtagCalls).toHaveLength(2);
    expect((gtagCalls[1][2] as any).page_location).toBe("https://collaborate8.com/resources/child-maintenance-guide");
    expect((gtagCalls[1][2] as any).page_title).toBe("Child Maintenance Guide | Collabor8");
  });

  it("checks withdrawal again before a pending cookieless send", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(11);
    sendGa4PageView();
    localStorage.setItem("medi8-cookie-consent", "declined");
    updateTitle("FAQ | Collabor8");
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    expect(consentAtSend).toEqual(["denied"]);
  });
});

describe("sendGa4ConsentedLandingPageView", () => {
  beforeEach(() => setupDom(LANDING));

  it("re-sends the landing page_view with UTMs and referrer after Accept", async () => {
    const { sendGa4PageView, sendGa4ConsentedLandingPageView } = await loadModule(12);
    sendGa4PageView(); // pre-consent cookieless landing ping
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    expect(consentAtSend).toEqual(["denied"]);
    accept();
    sendGa4ConsentedLandingPageView();
    expect(gtagCalls).toHaveLength(2);
    const hit = gtagCalls[1][2] as any;
    expect(gtagCalls[1][1]).toBe("page_view");
    expect(hit.send_to).toBe("G-2YB8M4ZYEG");
    expect(hit.page_location).toBe(LANDING);
    expect(hit.page_referrer).toBe(REFERRER);
    // Consent update ran before the hit went out
    expect(consentAtSend).toEqual(["denied", "granted"]);
  });

  it("does not double with the pending first route send when Accept comes first", async () => {
    const { sendGa4PageView, sendGa4ConsentedLandingPageView } = await loadModule(13);
    sendGa4PageView(); // pending, waiting on title/fallback
    accept();
    sendGa4ConsentedLandingPageView(); // banner Accept handler
    expect(gtagCalls).toHaveLength(1);
    await fallback(); // pending route send must not re-fire the landing hit
    expect(gtagCalls).toHaveLength(1);
    expect((gtagCalls[0][2] as any).page_location).toBe(LANDING);
  });

  it("fires only once per session even if called again", async () => {
    accept();
    const { sendGa4ConsentedLandingPageView } = await loadModule(14);
    sendGa4ConsentedLandingPageView();
    sendGa4ConsentedLandingPageView();
    expect(gtagCalls).toHaveLength(1);
  });

  it("sends nothing without consent", async () => {
    const { sendGa4ConsentedLandingPageView } = await loadModule(15);
    sendGa4ConsentedLandingPageView();
    expect(gtagCalls).toHaveLength(0);
  });

  it("keeps later route page_views on the current URL after the landing re-send", async () => {
    const { sendGa4PageView, sendGa4ConsentedLandingPageView } = await loadModule(16);
    sendGa4PageView();
    await fallback();
    accept();
    sendGa4ConsentedLandingPageView();
    sendGa4PageView("https://collaborate8.com/faq");
    updateTitle("FAQ | Collabor8");
    expect(gtagCalls).toHaveLength(3);
    const routeHit = gtagCalls[2][2] as any;
    expect(routeHit.page_location).toBe("https://collaborate8.com/faq");
    expect(routeHit.page_referrer).toBeUndefined();
  });

  it("stored consent on load: first send is the consented landing hit with referrer", async () => {
    accept();
    const { sendGa4PageView } = await loadModule(17);
    sendGa4PageView();
    await fallback();
    expect(gtagCalls).toHaveLength(1);
    const hit = gtagCalls[0][2] as any;
    expect(hit.page_location).toBe(LANDING);
    expect(hit.page_referrer).toBe(REFERRER);
    expect(consentAtSend).toEqual(["granted"]);
  });
});
