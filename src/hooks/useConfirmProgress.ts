import { useCallback, useEffect, useMemo, useState } from "react";
import { canStartConfirm, createConfirmRunner, type ConfirmPhase } from "@/lib/confirmProgress";

/**
 * Runs one slow action with a clear progress state (see createConfirmRunner).
 * `action` resolves true when it worked (the page may then leave for Stripe), false otherwise.
 */
export function useConfirmProgress() {
  const [phase, setPhase] = useState<ConfirmPhase>("idle");
  // One runner per component, so its in-flight guard also stops two taps in the same frame.
  const runner = useMemo(() => createConfirmRunner(setPhase), []);

  const reset = useCallback(() => runner.reset(), [runner]);

  // Coming back with the browser Back button restores this page from memory: start fresh.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => { if (e.persisted) runner.reset(); };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [runner]);

  return { phase, run: runner.run, reset, canStart: canStartConfirm(phase) };
}
