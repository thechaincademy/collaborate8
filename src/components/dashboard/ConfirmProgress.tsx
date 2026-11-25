import { Check, Loader2 } from "lucide-react";
import { CONFIRM_COPY, type ConfirmPhase } from "@/lib/confirmProgress";

/** The calm status line under a slow confirm button. Nothing shows while idle. */
export default function ConfirmProgress({ phase, successText = CONFIRM_COPY.success, redirectText = CONFIRM_COPY.redirecting }: { phase: ConfirmPhase; successText?: string; redirectText?: string }) {
  if (phase === "idle") return <div aria-live="polite" role="status" className="sr-only" />;
  if (phase === "error") return <p role="alert" data-testid="confirm-error" className="mt-3 text-sm text-destructive">{CONFIRM_COPY.error}</p>;
  if (phase === "success") {
    return (
      <div role="status" aria-live="polite" data-testid="confirm-success" className="mt-3 flex items-start gap-2 rounded-lg bg-teal/10 px-3 py-2 text-sm font-medium text-foreground">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal" strokeWidth={3} />
        <span>{successText}. {redirectText}</span>
      </div>
    );
  }
  return (
    <div role="status" aria-live="polite" data-testid="confirm-working" className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
      <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" />
      <span>{phase === "slow" ? CONFIRM_COPY.slow : CONFIRM_COPY.working}</span>
    </div>
  );
}
