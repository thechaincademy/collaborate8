import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { RECORDING_MASK_PROPS, useSafeguardingRecording } from "@/lib/safeguarding/recordingPrivacy";

/** Root wrapper for every safeguarding screen. Session recorders must not capture it. */
export function SafeguardingSurface({ children, className }: { children: ReactNode; className?: string }) {
  useSafeguardingRecording();
  return (
    <div {...RECORDING_MASK_PROPS} className={cn("hj-suppress", className)}>
      {children}
    </div>
  );
}
