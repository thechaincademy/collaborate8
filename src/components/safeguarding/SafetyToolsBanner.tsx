import { downloadRecord } from "@/lib/safeguarding/downloadRecord";
import { CmsGuidance } from "@/components/safeguarding/CmsGuidance";
import { SafetyNotice } from "@/components/safeguarding/SafetyNotice";
import type { SafeguardingState } from "@/hooks/useSafeguarding";

/** Shown only when this account's safeguarding switch is on and shared tools are paused. Reads stay available. */
export function SafetyToolsBanner({ safety }: { safety: Pick<SafeguardingState, "enabled" | "paused" | "notice" | "showCmsGuidance"> }) {
  if (!safety.enabled || !safety.paused) return null;
  return (
    <div>
      <SafetyNotice notice={safety.notice} />
      {safety.showCmsGuidance && <CmsGuidance onDownload={() => void downloadRecord()} />}
    </div>
  );
}
