import { toast } from "sonner";
import { cmsGuidanceCopy } from "@/content/safeguarding";
import { openRecordPdf } from "@/lib/safeguarding/api";

export async function downloadRecord() {
  try {
    await openRecordPdf();
  } catch {
    toast.error(cmsGuidanceCopy.record);
  }
}
