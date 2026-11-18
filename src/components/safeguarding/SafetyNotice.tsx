import { Link } from "react-router-dom";
import { SHARED_PAUSE_NOTICE, reportCopy } from "@/content/safeguarding";
import { SafeguardingSurface } from "@/components/safeguarding/SafeguardingSurface";

/** One notice for both parents. It does not say who paused tools or why. */
export function SafetyNotice({ notice, showReport = true }: { notice?: string | null; showReport?: boolean }) {
  return (
    <SafeguardingSurface className="mb-4 rounded-2xl border border-border bg-card p-4">
      <p className="text-sm text-foreground" role="status" aria-live="polite">
        {notice || SHARED_PAUSE_NOTICE}
      </p>
      {showReport && (
        <Link
          to="/safeguarding/report"
          aria-label={reportCopy.button}
          className="mt-3 inline-flex min-h-11 items-center justify-center rounded-xl bg-foreground px-4 text-sm font-medium text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {reportCopy.button}
        </Link>
      )}
    </SafeguardingSurface>
  );
}
