import { describe, expect, test } from "bun:test";
import {
  CALM_CHECK_GAVE_UP_COPY,
  CALM_CHECK_EXTEND_ETA_SECONDS,
  calmCheckBusyCopy,
  displayBusyCountdown,
  isPremiumRequiredResponse,
  runCalmCheck,
  startOrKeepBusyDeadline,
  type CalmBusyDeadline,
  type CalmCheckInvoke,
} from "../src/lib/calmCheck";

const draft = "Please sort the payment today.";
const rewrite = "Could we sort the payment today?";

const busyCopyHasNoForbidden = (s: string) => {
  expect(s).not.toContain("\u2014");
  expect(s).not.toContain("police");
  expect(s).not.toContain("victim");
  expect(s).not.toContain("Police");
  expect(s).not.toContain("Victim");
};

describe("calm check copy", () => {
  test("busy countdown has no em dash and no forbidden words", () => {
    const s = calmCheckBusyCopy(12);
    expect(s).toBe("Our servers are busy. Your suggestion will be ready in about 12 seconds.");
    busyCopyHasNoForbidden(s);
    busyCopyHasNoForbidden(calmCheckBusyCopy(1));
    busyCopyHasNoForbidden(calmCheckBusyCopy({ kind: "few" }));
  });

  test("uses singular second when one second remains", () => {
    expect(calmCheckBusyCopy(1)).toBe(
      "Our servers are busy. Your suggestion will be ready in about 1 second.",
    );
    expect(calmCheckBusyCopy({ kind: "seconds", seconds: 1 })).toBe(
      "Our servers are busy. Your suggestion will be ready in about 1 second.",
    );
  });

  test("uses a few seconds after the countdown runs out", () => {
    expect(calmCheckBusyCopy(0)).toBe(
      "Our servers are busy. Your suggestion will be ready in a few seconds.",
    );
    expect(calmCheckBusyCopy({ kind: "few" })).toBe(
      "Our servers are busy. Your suggestion will be ready in a few seconds.",
    );
  });

  test("gave-up copy has no em dash and no forbidden words", () => {
    expect(CALM_CHECK_GAVE_UP_COPY).toContain("send your message as written");
    busyCopyHasNoForbidden(CALM_CHECK_GAVE_UP_COPY);
  });
});

describe("busy countdown is smooth and monotonic", () => {
  test("first suggested ETA starts a deadline and later ones never raise it", () => {
    const start = startOrKeepBusyDeadline(null, 12, 0);
    expect(start).toBe(12_000);
    expect(startOrKeepBusyDeadline(start, 12, 1_000)).toBe(12_000);
    expect(startOrKeepBusyDeadline(start, 20, 1_000)).toBe(12_000);
    expect(startOrKeepBusyDeadline(start, 10, 5_000)).toBe(12_000);
  });

  test("display counts down each second then stays on a few seconds", () => {
    const deadline = startOrKeepBusyDeadline(null, 12, 0);
    expect(displayBusyCountdown(deadline, 0)).toEqual({ kind: "seconds", seconds: 12 });
    expect(displayBusyCountdown(deadline, 1_000)).toEqual({ kind: "seconds", seconds: 11 });
    expect(displayBusyCountdown(deadline, 11_000)).toEqual({ kind: "seconds", seconds: 1 });
    expect(displayBusyCountdown(deadline, 12_000)).toEqual({ kind: "few" });
    expect(displayBusyCountdown(deadline, 19_000)).toEqual({ kind: "few" });
    expect(displayBusyCountdown("few", 19_000)).toEqual({ kind: "few" });
    expect(displayBusyCountdown(null, 0)).toBeNull();
  });

  test("failed retries that suggest a fresh ETA do not jump the copy back up", () => {
    let deadline: CalmBusyDeadline = null;
    const shown: string[] = [];
    // Matches the test-site bug: failed replies call onWaiting about once a
    // second with min(12, remaining budget). The first ETA is 12s, then at
    // about 19s the leftover budget is 11 and used to reset the display to 10.
    for (let t = 0; t <= 20_000; t += 1_000) {
      const suggested = Math.min(12, Math.max(1, Math.ceil((30_000 - t) / 1_000)));
      deadline = startOrKeepBusyDeadline(deadline, suggested, t);
      const display = displayBusyCountdown(deadline, t);
      expect(display).not.toBeNull();
      shown.push(calmCheckBusyCopy(display!));
    }
    expect(shown[0]).toBe("Our servers are busy. Your suggestion will be ready in about 12 seconds.");
    expect(shown[11]).toBe("Our servers are busy. Your suggestion will be ready in about 1 second.");
    expect(shown[12]).toBe("Our servers are busy. Your suggestion will be ready in a few seconds.");
    expect(shown[19]).toBe("Our servers are busy. Your suggestion will be ready in a few seconds.");
    const numbers: number[] = [];
    for (const line of shown) {
      const m = line.match(/about (\d+) seconds?/);
      if (m) numbers.push(Number(m[1]));
    }
    for (let i = 1; i < numbers.length; i++) {
      expect(numbers[i]).toBeLessThanOrEqual(numbers[i - 1]);
    }
    expect(numbers.at(-1)).toBe(1);
    expect(shown.filter((s) => s.includes("about 10 seconds")).length).toBe(1);
  });
});

describe("premium denial", () => {
  test("JSON premium_required is detected", () => {
    expect(isPremiumRequiredResponse({ error: "premium_required", feature: "rewrite" }, null)).toBe(true);
  });

  test("other errors are not a premium denial", () => {
    expect(isPremiumRequiredResponse({ error: "AI not configured" }, null)).toBe(false);
    expect(isPremiumRequiredResponse({ status: "failed" }, null)).toBe(false);
  });
});

type Step = { data?: unknown; error?: unknown };

const scripted = (steps: Step[]): { invoke: CalmCheckInvoke; calls: Record<string, unknown>[] } => {
  const calls: Record<string, unknown>[] = [];
  let i = 0;
  const invoke: CalmCheckInvoke = async (body) => {
    calls.push(body);
    const step = steps[Math.min(i, steps.length - 1)];
    i += 1;
    return { data: step.data ?? null, error: step.error ?? null };
  };
  return { invoke, calls };
};

const run = (opts: {
  steps: Step[];
  signal?: AbortSignal;
  maxMs?: number;
  pollMs?: number;
  start?: number;
}) => {
  const waits: number[] = [];
  const etas: number[] = [];
  let now = opts.start ?? 0;
  const { invoke, calls } = scripted(opts.steps);
  const promise = runCalmCheck({
    invoke,
    draft,
    signal: opts.signal ?? new AbortController().signal,
    onWaiting: (eta) => etas.push(eta),
    now: () => now,
    wait: async (ms, signal) => {
      if (signal.aborted) throw new DOMException("Aborted", "AbortError");
      waits.push(ms);
      now += ms;
    },
    maxMs: opts.maxMs ?? 30_000,
    pollMs: opts.pollMs ?? 1_000,
  });
  return { promise, calls, waits, etas, getNow: () => now };
};

describe("runCalmCheck", () => {
  test("a ready rewrite is a suggestion", async () => {
    const { promise, calls, etas } = run({
      steps: [{ data: { status: "done", needs_rewrite: true, rewrite } }],
    });
    await expect(promise).resolves.toEqual({ kind: "suggestion", rewrite });
    expect(calls).toEqual([{ mode: "send", draft }]);
    expect(etas).toEqual([]);
  });

  test("a done pass sends as typed, with no wait", async () => {
    const { promise, etas } = run({
      steps: [{ data: { status: "done", needs_rewrite: false, rewrite: null } }],
    });
    await expect(promise).resolves.toEqual({ kind: "pass" });
    expect(etas).toEqual([]);
  });

  test("pending then a rewrite: poll result and surface the suggestion", async () => {
    const { promise, calls, etas } = run({
      steps: [
        { data: { status: "pending", job_id: "job-1", eta_seconds: 12 } },
        { data: { status: "pending", job_id: "job-1", eta_seconds: 8 } },
        { data: { status: "done", job_id: "job-1", needs_rewrite: true, rewrite } },
      ],
    });
    await expect(promise).resolves.toEqual({ kind: "suggestion", rewrite });
    expect(calls[0]).toEqual({ mode: "send", draft });
    expect(calls[1]).toEqual({ mode: "result", job_id: "job-1" });
    expect(calls[2]).toEqual({ mode: "result", job_id: "job-1" });
    expect(etas).toEqual([12, 8]);
  });

  test("pending then a pass hides the wait and treats the draft as already calm", async () => {
    const { promise } = run({
      steps: [
        { data: { status: "pending", job_id: "job-2", eta_seconds: 12 } },
        { data: { status: "done", job_id: "job-2", needs_rewrite: false, rewrite: null } },
      ],
    });
    await expect(promise).resolves.toEqual({ kind: "pass" });
  });

  test("failed then a later rewrite: retry send with a countdown, do not skip", async () => {
    const { promise, calls, etas } = run({
      steps: [
        { data: { status: "failed" } },
        { data: { status: "done", needs_rewrite: true, rewrite } },
      ],
    });
    await expect(promise).resolves.toEqual({ kind: "suggestion", rewrite });
    expect(calls).toEqual([
      { mode: "send", draft },
      { mode: "send", draft },
    ]);
    expect(etas[0]).toBeGreaterThanOrEqual(1);
  });

  test("an invoke error is treated as busy and retried", async () => {
    const { promise, calls } = run({
      steps: [
        { data: null, error: { message: "network" } },
        { data: { status: "done", needs_rewrite: true, rewrite } },
      ],
    });
    await expect(promise).resolves.toEqual({ kind: "suggestion", rewrite });
    expect(calls).toHaveLength(2);
  });

  test("abort while waiting returns aborted and stops polling", async () => {
    const ac = new AbortController();
    const waits: number[] = [];
    const { invoke } = scripted([{ data: { status: "failed" } }]);
    let now = 0;
    const promise = runCalmCheck({
      invoke,
      draft,
      signal: ac.signal,
      onWaiting: () => {},
      now: () => now,
      wait: async (ms, signal) => {
        waits.push(ms);
        ac.abort();
        if (signal.aborted) throw new DOMException("Aborted", "AbortError");
        now += ms;
      },
      maxMs: 30_000,
      pollMs: 1_000,
    });
    await expect(promise).resolves.toEqual({ kind: "aborted" });
    expect(waits).toHaveLength(1);
  });

  test("gives up after the 30 second budget and does not block send", async () => {
    const { promise, etas } = run({
      steps: [{ data: { status: "failed" } }],
      maxMs: 2_500,
      pollMs: 1_000,
    });
    await expect(promise).resolves.toEqual({ kind: "gave_up" });
    expect(etas.length).toBeGreaterThan(0);
  });

  test("pending poll that fails starts a new send retry", async () => {
    const { promise, calls } = run({
      steps: [
        { data: { status: "pending", job_id: "job-3", eta_seconds: 12 } },
        { data: { status: "failed", job_id: "job-3" } },
        { data: { status: "done", needs_rewrite: true, rewrite } },
      ],
    });
    await expect(promise).resolves.toEqual({ kind: "suggestion", rewrite });
    expect(calls.map((c) => c.mode)).toEqual(["send", "result", "send"]);
  });
});

describe("constants", () => {
  test("extend eta matches the server contract", () => {
    expect(CALM_CHECK_EXTEND_ETA_SECONDS).toBe(8);
  });
});

describe("calm check first answer is slow", () => {
  test("shows the busy countdown once the first send call is late, then returns the inline answer", async () => {
    const waits: number[] = [];
    const invoke: CalmCheckInvoke = async () => {
      await new Promise((r) => setTimeout(r, 60));
      return { data: { status: "done", needs_rewrite: true, rewrite }, error: null };
    };
    const out = await runCalmCheck({
      invoke,
      draft,
      signal: new AbortController().signal,
      onWaiting: (eta) => waits.push(eta),
      firstAnswerMs: 20,
    });
    expect(out).toEqual({ kind: "suggestion", rewrite });
    expect(waits).toEqual([12]);
  });

  test("no countdown when the first send call answers in time", async () => {
    const waits: number[] = [];
    const out = await runCalmCheck({
      invoke: async () => ({ data: { status: "done", needs_rewrite: false, rewrite: null }, error: null }),
      draft,
      signal: new AbortController().signal,
      onWaiting: (eta) => waits.push(eta),
      firstAnswerMs: 20,
    });
    expect(out).toEqual({ kind: "pass" });
    expect(waits).toEqual([]);
  });

  test("an aborted check shows no late countdown", async () => {
    const waits: number[] = [];
    const ac = new AbortController();
    const out = runCalmCheck({
      invoke: async () => {
        await new Promise((r) => setTimeout(r, 60));
        return { data: { status: "done", needs_rewrite: false, rewrite: null }, error: null };
      },
      draft,
      signal: ac.signal,
      onWaiting: (eta) => waits.push(eta),
      firstAnswerMs: 30,
    });
    ac.abort();
    expect((await out).kind).toBe("aborted");
    expect(waits).toEqual([]);
  });

  test("polls twice a second", async () => {
    const { CALM_CHECK_POLL_MS } = await import("../src/lib/calmCheck");
    expect(CALM_CHECK_POLL_MS).toBe(500);
  });
});
