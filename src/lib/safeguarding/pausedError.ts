import { toast } from "sonner";
import { SHARED_PAUSE_NOTICE } from "@/content/safeguarding";

export function isSgPausedError(error: { message?: string } | null | undefined): boolean {
  return (error?.message ?? "").includes("sg_paused");
}

export function notifyIfPaused(error: { message?: string } | null | undefined): boolean {
  if (!isSgPausedError(error)) return false;
  toast.message(SHARED_PAUSE_NOTICE);
  return true;
}
