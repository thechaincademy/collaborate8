import { CMS_COLLECT_AND_PAY_URL, CMS_HOW_TO_APPLY_URL, cmsGuidanceCopy } from "@/content/safeguarding";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { SafeguardingSurface } from "@/components/safeguarding/SafeguardingSurface";

export function CmsGuidance({ onDownload, downloading }: { onDownload?: () => void; downloading?: boolean }) {
  return (
    <SafeguardingSurface className="mb-4 rounded-2xl border border-border bg-card p-4">
      <h2 className="text-base font-semibold text-foreground">{cmsGuidanceCopy.title}</h2>
      <p className="mt-2 text-sm text-foreground">{cmsGuidanceCopy.body}</p>
      <a href={CMS_COLLECT_AND_PAY_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center text-sm font-medium text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {cmsGuidanceCopy.collectLink}
      </a>
      <a href={CMS_HOW_TO_APPLY_URL} target="_blank" rel="noopener noreferrer" className="mt-1 flex min-h-11 items-center text-sm font-medium text-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
        {cmsGuidanceCopy.applyLink}
      </a>
      <p className="mt-3 text-sm text-foreground">{cmsGuidanceCopy.record}</p>
      {onDownload && (
        <Button type="button" variant="outline" className="mt-3 min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={onDownload} disabled={downloading}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          {cmsGuidanceCopy.download}
        </Button>
      )}
    </SafeguardingSurface>
  );
}
