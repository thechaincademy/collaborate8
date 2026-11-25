/** Client contract for the Collabor8 calm check on Send (chat-rewrite, mode "send"). */

export const CALM_CHECK_MAX_MS = 30_000;
export const CALM_CHECK_POLL_MS = 1_000;
export const CALM_CHECK_FIRST_ETA_SECONDS = 12;
export const CALM_CHECK_EXTEND_ETA_SECONDS = 8;

export type CalmBusyDisplay = { kind: "seconds"; seconds: number } | { kind: "few" };

/** Deadline ms, "few" once the first ETA has run out, or null when not waiting. */
export type CalmBusyDeadline = number | "few" | null;

export const calmCheckBusyCopy = (display: number | CalmBusyDisplay) => {
  const state: CalmBusyDisplay =
    typeof display === "number"
      ? display <= 0
        ? { kind: "few" }
        : { kind: "seconds", seconds: Math.max(1, Math.ceil(display)) }
      : display;
  if (state.kind === "few") {
    return "Our servers are busy. Your suggestion will be ready in a few seconds.";
  }
  const n = Math.max(1, Math.ceil(state.seconds));
  const unit = n === 1 ? "second" : "seconds";
  return `Our servers are busy. Your suggestion will be ready in about ${n} ${unit}.`;
};

/**
 * Keep a single countdown deadline. A later suggested ETA never moves the
 * deadline later, so the number never jumps back up. After it expires, stay
 * on "a few seconds" until the check ends.
 */
export function startOrKeepBusyDeadline(
  current: CalmBusyDeadline,
  suggestedEtaSeconds: number,
  nowMs: number,
): Exclude<CalmBusyDeadline, null> {
  if (current === "few") return "few";
  if (typeof current === "number") {
    if (current <= nowMs) return "few";
    return current;
  }
  const eta = Math.ceil(suggestedEtaSeconds);
  if (eta <= 0) return "few";
  return nowMs + eta * 1000;
}

export function displayBusyCountdown(deadline: CalmBusyDeadline, nowMs: number): CalmBusyDisplay | null {
  if (deadline === null) return null;
  if (deadline === "few") return { kind: "few" };
  const left = Math.ceil((deadline - nowMs) / 1000);
  if (left <= 0) return { kind: "few" };
  return { kind: "seconds", seconds: left };
}

export const CALM_CHECK_GAVE_UP_COPY =
  "We could not get a suggestion this time. You can send your message as written.";

export type CalmCheckInvoke = (body: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;

export type CalmCheckOutcome =
  | { kind: "suggestion"; rewrite: string }
  | { kind: "pass" }
  | { kind: "aborted" }
  | { kind: "gave_up" }
  | { kind: "premium_required" };

type SendBody = {
  status?: string;
  needs_rewrite?: boolean;
  rewrite?: string | null;
  job_id?: string;
  eta_seconds?: number;
  error?: unknown;
};

const asRecord = (data: unknown): SendBody =>
  data && typeof data === "object" ? (data as SendBody) : {};

const httpStatus = (error: unknown): number | null => {
  if (!error || typeof error !== "object" || !("context" in error)) return null;
  const response = (error as { context?: unknown }).context;
  if (typeof Response !== "undefined" && response instanceof Response) return response.status;
  if (response && typeof response === "object" && "status" in response) {
    const s = Number((response as { status: unknown }).status);
    return Number.isFinite(s) ? s : null;
  }
  return null;
};

export const isPremiumRequiredResponse = (data: unknown, error: unknown): boolean => {
  const body = asRecord(data);
  if (body.error === "premium_required") return true;
  return httpStatus(error) === 402 && asRecord(data).error === "premium_required";
};

const rewriteIfReady = (data: unknown, draft: string): string | null => {
  const body = asRecord(data);
  if (body.status && body.status !== "done") return null;
  const rw = typeof body.rewrite === "string" ? body.rewrite.trim() : "";
  if (body.needs_rewrite === true && rw && rw !== draft.trim()) return rw;
  return null;
};

const isDonePass = (data: unknown): boolean => {
  const body = asRecord(data);
  if (body.status && body.status !== "done") return false;
  if (body.needs_rewrite === true) return false;
  // A done response with no rewrite, or an older client-shaped pass.
  return body.status === "done" || body.needs_rewrite === false;
};

const isPending = (data: unknown): { job_id: string; eta_seconds: number } | null => {
  const body = asRecord(data);
  if (body.status !== "pending" || typeof body.job_id !== "string" || !body.job_id) return null;
  const eta = Number(body.eta_seconds);
  return { job_id: body.job_id, eta_seconds: Number.isFinite(eta) && eta > 0 ? eta : CALM_CHECK_FIRST_ETA_SECONDS };
};

const isFailedOrUnknown = (data: unknown, error: unknown): boolean => {
  if (error) return true;
  const body = asRecord(data);
  return body.status === "failed" || body.status === "unknown";
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

export async function runCalmCheck(opts: {
  invoke: CalmCheckInvoke;
  draft: string;
  signal: AbortSignal;
  onWaiting: (etaSeconds: number) => void;
  now?: () => number;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
  maxMs?: number;
  pollMs?: number;
}): Promise<CalmCheckOutcome> {
  const now = opts.now ?? Date.now;
  const wait = opts.wait ?? sleep;
  const maxMs = opts.maxMs ?? CALM_CHECK_MAX_MS;
  const pollMs = opts.pollMs ?? CALM_CHECK_POLL_MS;
  const started = now();
  const remaining = () => maxMs - (now() - started);

  const aborted = (): CalmCheckOutcome | null => (opts.signal.aborted ? { kind: "aborted" } : null);

  const invokeSend = () => opts.invoke({ mode: "send", draft: opts.draft });
  const invokeResult = (job_id: string) => opts.invoke({ mode: "result", job_id });

  const handleData = async (data: unknown, error: unknown): Promise<CalmCheckOutcome | "retry"> => {
    const stop = aborted();
    if (stop) return stop;
    if (isPremiumRequiredResponse(data, error)) return { kind: "premium_required" };
    const suggestion = rewriteIfReady(data, opts.draft);
    if (suggestion) return { kind: "suggestion", rewrite: suggestion };
    if (!error && isDonePass(data)) return { kind: "pass" };
    const pending = !error ? isPending(data) : null;
    if (pending) {
      opts.onWaiting(pending.eta_seconds);
      while (remaining() > 0) {
        const stopWait = aborted();
        if (stopWait) return stopWait;
        const left = remaining();
        if (left <= 0) break;
        try {
          await wait(Math.min(pollMs, left), opts.signal);
        } catch {
          return { kind: "aborted" };
        }
        const stopAfter = aborted();
        if (stopAfter) return stopAfter;
        const polled = await invokeResult(pending.job_id);
        if (isPremiumRequiredResponse(polled.data, polled.error)) return { kind: "premium_required" };
        const ready = rewriteIfReady(polled.data, opts.draft);
        if (ready) return { kind: "suggestion", rewrite: ready };
        if (!polled.error && isDonePass(polled.data)) return { kind: "pass" };
        const still = !polled.error ? isPending(polled.data) : null;
        if (still) {
          opts.onWaiting(still.eta_seconds);
          continue;
        }
        // failed / unknown / error: retry a new send while time remains
        return "retry";
      }
      return remaining() <= 0 ? { kind: "gave_up" } : "retry";
    }
    if (isFailedOrUnknown(data, error) || error) return "retry";
    // Empty or unexpected body: treat as busy and retry.
    return "retry";
  };

  try {
    while (remaining() > 0) {
      const stop = aborted();
      if (stop) return stop;
      const { data, error } = await invokeSend();
      const result = await handleData(data, error);
      if (result !== "retry") return result;
      if (remaining() <= 0) break;
      opts.onWaiting(Math.min(CALM_CHECK_FIRST_ETA_SECONDS, Math.max(1, Math.ceil(remaining() / 1000))));
      try {
        await wait(Math.min(pollMs, remaining()), opts.signal);
      } catch {
        return { kind: "aborted" };
      }
    }
    return aborted() ?? { kind: "gave_up" };
  } catch (e) {
    if (opts.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return { kind: "aborted" };
    if (remaining() <= 0) return { kind: "gave_up" };
    opts.onWaiting(CALM_CHECK_EXTEND_ETA_SECONDS);
    try {
      await wait(Math.min(pollMs, remaining()), opts.signal);
    } catch {
      return { kind: "aborted" };
    }
    // One more attempt after an unexpected throw, then stop if still looping via the caller.
    if (remaining() <= 0 || opts.signal.aborted) return aborted() ?? { kind: "gave_up" };
    try {
      const { data, error } = await invokeSend();
      const result = await handleData(data, error);
      return result === "retry" ? { kind: "gave_up" } : result;
    } catch {
      return aborted() ?? { kind: "gave_up" };
    }
  }
}
