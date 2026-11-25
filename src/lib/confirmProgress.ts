// Calm, shared wording and timing for the slow confirm buttons (payer "Confirm arrangement",
// receiver "Confirm receiving account"). Both call Stripe, which can take several seconds.
export const CONFIRM_SLOW_AFTER_MS = 8000;

export const CONFIRM_COPY = {
  working: "Confirming…",
  slow: "Still working, please don't close this page.",
  success: "Amount confirmed",
  successReceiver: "Confirmed",
  redirecting: "Opening secure payment with Stripe…",
  error: "That didn't go through, please try again",
} as const;

export type ConfirmPhase = "idle" | "working" | "slow" | "success" | "error";

/** The button stays disabled for every phase except idle and error (error allows a retry). */
export const confirmBusy = (phase: ConfirmPhase) => phase === "working" || phase === "slow" || phase === "success";

/** A press is accepted only when nothing is in flight, so a second tap never starts a second call. */
export const canStartConfirm = (phase: ConfirmPhase) => !confirmBusy(phase);

export interface ConfirmRunner {
  run(action: () => Promise<boolean>): Promise<boolean>;
  reset(): void;
}

/**
 * The state machine behind the button, free of React so it can be tested with fake timers.
 * working straight away, slow after CONFIRM_SLOW_AFTER_MS, then success or error.
 * Success is final on purpose (the browser is leaving for Stripe); error allows a retry.
 */
export function createConfirmRunner(
  onPhase: (phase: ConfirmPhase) => void,
  timers: { set: (fn: () => void, ms: number) => unknown; clear: (id: unknown) => void } = {
    set: (fn, ms) => setTimeout(fn, ms),
    clear: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
  },
  slowAfterMs = CONFIRM_SLOW_AFTER_MS,
): ConfirmRunner {
  let inFlight = false;
  let timer: unknown = null;
  let current: ConfirmPhase = "idle";
  const set = (p: ConfirmPhase) => { current = p; onPhase(p); };
  const stop = () => { if (timer !== null) timers.clear(timer); timer = null; };
  return {
    async run(action) {
      if (inFlight) return false; // a second tap never starts a second call
      inFlight = true;
      set("working");
      stop();
      timer = timers.set(() => { if (current === "working") set("slow"); }, slowAfterMs);
      let ok = false;
      try { ok = await action(); } catch { ok = false; }
      stop();
      if (ok) set("success");
      else { inFlight = false; set("error"); }
      return ok;
    },
    reset() { stop(); inFlight = false; set("idle"); },
  };
}
