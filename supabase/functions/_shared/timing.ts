// Per-request step timings for the payment functions. Logs step names and milliseconds only:
// never user ids, emails, amounts, ids from Stripe or any request body.
export interface StepTimer {
  /** Run one step and log how long it took, whether it finishes or throws. */
  time<T>(step: string, fn: () => Promise<T>): Promise<T>;
  /** Log the total for the request. */
  done(action: string, outcome: string): void;
}

export function startTimer(scope: string): StepTimer {
  const t0 = performance.now();
  const steps: Record<string, number> = {};
  return {
    async time<T>(step: string, fn: () => Promise<T>): Promise<T> {
      const s = performance.now();
      try {
        return await fn();
      } finally {
        steps[step] = Math.round(performance.now() - s);
      }
    },
    done(action: string, outcome: string) {
      console.log(`[${scope}] TIMING ${JSON.stringify({ action, outcome, totalMs: Math.round(performance.now() - t0), steps })}`);
    },
  };
}
