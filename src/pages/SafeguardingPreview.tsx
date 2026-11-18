import { useSearchParams } from "react-router-dom";
import { CmsGuidance } from "@/components/safeguarding/CmsGuidance";
import { DslDashboard } from "@/components/safeguarding/DslDashboard";
import { QuietAndSecurity } from "@/components/safeguarding/QuietAndSecurity";
import { ReportConcernForm } from "@/components/safeguarding/ReportConcernForm";
import { SafetyNotice } from "@/components/safeguarding/SafetyNotice";
import { SuitabilityCheck } from "@/components/safeguarding/SuitabilityCheck";
import { SHARED_PAUSE_NOTICE } from "@/content/safeguarding";

const sampleFlags = [
  {
    id: "flag-1",
    parentA: "aaaaaaaa",
    parentB: "bbbbbbbb",
    status: "active",
    source: "concern",
    createdAt: "2026-11-18T09:00:00.000Z",
  },
];

const sampleConcerns = [
  {
    id: "concern-1",
    parentA: "aaaaaaaa",
    parentB: "bbbbbbbb",
    category: "message",
    body: "Example note for the safeguarding lead.",
    status: "open",
    createdAt: "2026-11-18T09:00:00.000Z",
    linkedMessageId: null,
    linkedPaymentId: null,
  },
];

/** Local preview of draft screens. The production build does not mount this page. */
const SafeguardingPreview = () => {
  const [params] = useSearchParams();
  const screen = params.get("screen") ?? "check";

  if (screen === "notice") {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-background px-6 py-10">
        <SafetyNotice notice={SHARED_PAUSE_NOTICE} />
      </div>
    );
  }
  if (screen === "cms") {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-background px-6 py-10">
        <SafetyNotice notice={SHARED_PAUSE_NOTICE} />
        <CmsGuidance onDownload={() => undefined} />
      </div>
    );
  }
  if (screen === "report") return <ReportConcernForm preview />;
  if (screen === "security") {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-background px-6 py-10">
        <div className="rounded-2xl border border-border bg-card">
          <QuietAndSecurity quiet={false} preview />
        </div>
      </div>
    );
  }
  if (screen === "dsl") {
    return <DslDashboard allowed preview flags={sampleFlags} concerns={sampleConcerns} />;
  }
  return <SuitabilityCheck preview />;
};

export default SafeguardingPreview;
