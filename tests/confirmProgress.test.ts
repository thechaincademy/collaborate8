import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  CONFIRM_COPY,
  CONFIRM_SLOW_AFTER_MS,
  canStartConfirm,
  confirmBusy,
  createConfirmRunner,
  type ConfirmPhase,
} from "../src/lib/confirmProgress";
import { startTimer } from "../supabase/functions/_shared/timing";

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

function fakeTimers() {
  let now = 0;
  const jobs: { at: number; fn: () => void; id: number; live: boolean }[] = [];
  let next = 1;
  return {
    timers: {
      set: (fn: () => void, ms: number) => { const j = { at: now + ms, fn, id: next++, live: true }; jobs.push(j); return j.id; },
      clear: (id: unknown) => { const j = jobs.find((x) => x.id === id); if (j) j.live = false; },
    },
    advance(ms: number) {
      now += ms;
      for (const j of jobs) if (j.live && j.at <= now) { j.live = false; j.fn(); }
    },
  };
}
const deferred = <T,>() => { let resolve!: (v: T) => void; const promise = new Promise<T>((r) => { resolve = r; }); return { promise, resolve }; };

describe("confirm button copy", () => {
  test("matches the room spec and Collabor8 copy rules", () => {
    expect(CONFIRM_COPY.working).toBe("Confirming…");
    expect(CONFIRM_COPY.slow).toBe("Still working, please don't close this page.");
    expect(CONFIRM_COPY.success).toBe("Amount confirmed");
    expect(CONFIRM_COPY.error).toBe("That didn't go through, please try again");
    expect(CONFIRM_SLOW_AFTER_MS).toBe(8000);
    for (const text of Object.values(CONFIRM_COPY)) {
      expect(text).not.toMatch(/[—–]/);
      expect(text.toLowerCase()).not.toMatch(/police|victim/);
    }
  });
});

describe("confirm progress state machine", () => {
  test("working at once, slow after 8 seconds, then success; the button stays busy", async () => {
    const seen: ConfirmPhase[] = [];
    const ft = fakeTimers();
    const runner = createConfirmRunner((p) => seen.push(p), ft.timers);
    const d = deferred<boolean>();
    const p = runner.run(() => d.promise);
    expect(seen).toEqual(["working"]);
    ft.advance(7999);
    expect(seen).toEqual(["working"]);
    ft.advance(1);
    expect(seen).toEqual(["working", "slow"]);
    d.resolve(true);
    expect(await p).toBe(true);
    expect(seen).toEqual(["working", "slow", "success"]);
    expect(confirmBusy("success")).toBe(true);
  });

  test("a fast success never shows the slow note", async () => {
    const seen: ConfirmPhase[] = [];
    const ft = fakeTimers();
    const runner = createConfirmRunner((p) => seen.push(p), ft.timers);
    await runner.run(async () => true);
    ft.advance(20000);
    expect(seen).toEqual(["working", "success"]);
  });

  test("a second tap while in flight does not start a second call", async () => {
    const ft = fakeTimers();
    let calls = 0;
    const runner = createConfirmRunner(() => {}, ft.timers);
    const d = deferred<boolean>();
    const first = runner.run(() => { calls++; return d.promise; });
    const second = await runner.run(() => { calls++; return Promise.resolve(true); });
    expect(second).toBe(false);
    expect(calls).toBe(1);
    d.resolve(true);
    await first;
    // success is final: the page is leaving, so no new call either
    expect(await runner.run(() => { calls++; return Promise.resolve(true); })).toBe(false);
    expect(calls).toBe(1);
  });

  test("failure, or a thrown error, shows the friendly error and allows a retry", async () => {
    const seen: ConfirmPhase[] = [];
    const ft = fakeTimers();
    const runner = createConfirmRunner((p) => seen.push(p), ft.timers);
    expect(await runner.run(async () => { throw new Error("boom"); })).toBe(false);
    expect(seen.at(-1)).toBe("error");
    expect(canStartConfirm("error")).toBe(true);
    expect(await runner.run(async () => true)).toBe(true);
    expect(seen.at(-1)).toBe("success");
  });

  test("busy phases block the button, idle and error do not", () => {
    expect(["working", "slow", "success"].every((p) => confirmBusy(p as ConfirmPhase))).toBe(true);
    expect(["idle", "error"].every((p) => canStartConfirm(p as ConfirmPhase))).toBe(true);
  });
});

describe("confirm buttons are wired to the progress state", () => {
  test("payer Confirm arrangement: disabled while busy, stays busy through the Stripe redirect", () => {
    const f = read("src/components/dashboard/PayingParentSetup.tsx");
    expect(f).toContain("useConfirmProgress");
    expect(f).toContain("<ConfirmProgress phase={phase} />");
    expect(f).toContain("disabled={!unlocked || !valid || loading || busy}");
    expect(f).toContain("if (!valid || !detailsDone || live || busy) return;");
    expect(f).toContain("await run(async () => {");
    expect(f).not.toContain('"Confirming..."');
  });

  test("receiver Confirm receiving account: disabled while busy, shows progress", () => {
    const f = read("src/components/dashboard/MaintenanceTab.tsx");
    expect(f).toContain("connectProgress.run(");
    expect(f).toContain("disabled={connectBusy}");
    expect(f).toContain("<ConfirmProgress phase={connectProgress.phase}");
    expect(f).toContain("if (connectBusy) return;");
  });

  test("Stripe buttons stay loading once they have a link, and clear it on Back", () => {
    const f = read("src/hooks/useStripe.tsx");
    expect(f.match(/leavingForStripe = true/g)?.length).toBe(2);
    expect(f.match(/if \(!leavingForStripe\) setLoading\(false\)/g)?.length).toBe(2);
    expect(f).toContain('addEventListener("pageshow"');
  });
});

describe("edge function timing log", () => {
  test("logs step names and milliseconds only", () => {
    const logs: string[] = [];
    const orig = console.log;
    console.log = (m: string) => { logs.push(String(m)); };
    return (async () => {
      try {
        const tm = startTimer("TEST");
        await tm.time("a", async () => 1);
        await tm.time("b", async () => { throw new Error("x"); }).catch(() => {});
        tm.done("act", "ok");
      } finally { console.log = orig; }
      expect(logs).toHaveLength(1);
      const j = JSON.parse(logs[0].replace(/^\[TEST\] TIMING /, ""));
      expect(Object.keys(j).sort()).toEqual(["action", "outcome", "steps", "totalMs"]);
      expect(Object.keys(j.steps).sort()).toEqual(["a", "b"]);
    })();
  });
});

describe("faster Stripe calls keep the same checks", () => {
  const subs = read("supabase/functions/stripe-subscriptions/index.ts");
  const connect = read("supabase/functions/stripe-connect/index.ts");

  test("checkout: reads and Stripe lookups run together, the 403 and receiver checks still come first", () => {
    const a = subs.indexOf('action === "create-subscription-checkout"');
    const body = subs.slice(a, subs.indexOf('action === "create-subscription"', a));
    expect(body).toContain("Promise.resolve(null)");
    const i403 = body.indexOf("status: 403");
    const iNotOnboarded = body.indexOf("RECEIVER_NOT_ONBOARDED");
    const iPending = body.indexOf("RECEIVER_CAPABILITIES_PENDING");
    const iPrice = body.indexOf("pricingProvider.createPrice");
    const iLookup = body.indexOf("findCustomerId");
    const iCreate = body.indexOf("createCustomer(");
    expect(i403).toBeGreaterThan(0);
    // Customer lookup and price are started only after the stored receiver row exists.
    expect(iNotOnboarded).toBeLessThan(iPrice);
    expect(iNotOnboarded).toBeLessThan(iLookup);
    // A customer is created only after the receiver is verified as ready.
    expect(iPending).toBeLessThan(iCreate);
    expect(body).not.toContain("getOrCreateCustomer");
    expect(body).toContain("transfer_data");
  });

  test("create-account: the early link is used only for a reused, non-legacy account", () => {
    expect(connect).toContain("!legacyV1 && speculativeLink");
    expect(connect).toContain("speculativeLink = null;");
    expect(connect).toContain("existingAccountAction(");
  });

  test("adapter keeps getOrCreateCustomer for the other actions", () => {
    const adapter = read("supabase/functions/_shared/stripe-adapter.ts");
    expect(adapter).toContain("async findCustomerId(");
    expect(adapter).toContain("async createCustomer(");
    expect(adapter).toContain("async getOrCreateCustomer(");
  });
});
