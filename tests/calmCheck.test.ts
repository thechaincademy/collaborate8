import { describe, expect, test } from "bun:test";
import {
  CALM_CHECK_GAVE_UP_COPY,
  CALM_CHECK_EXTEND_ETA_SECONDS,
  calmCheckBusyCopy,
  isPremiumRequiredResponse,
  runCalmCheck,
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
  });

  test("gave-up copy has no em dash and no forbidden words", () => {
    expect(CALM_CHECK_GAVE_UP_COPY).toContain("send your message as written");
    busyCopyHasNoForbidden(CALM_CHECK_GAVE_UP_COPY);
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
