import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SUITABILITY_QUESTIONS, suitabilityCopy, securityCheckCopy } from "@/content/safeguarding";
import { submitSuitability } from "@/lib/safeguarding/api";
import { answerOutcomes, answersAreComplete, type AnswerMap } from "@/lib/safeguarding/logic";
import { SafeguardingSurface } from "@/components/safeguarding/SafeguardingSurface";
import { SafetyNotice } from "@/components/safeguarding/SafetyNotice";
import { CmsGuidance } from "@/components/safeguarding/CmsGuidance";
import { QuietAndSecurity } from "@/components/safeguarding/QuietAndSecurity";
import { downloadRecord } from "@/lib/safeguarding/downloadRecord";

export function SuitabilityCheck({ onDone, preview = false }: { onDone?: () => void; preview?: boolean }) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSecurity, setShowSecurity] = useState(false);
  const outcomes = answerOutcomes(answers);
  const complete = answersAreComplete(answers);

  const save = async () => {
    if (!complete) return;
    if (preview) {
      setSaved(true);
      return;
    }
    setSaving(true);
    try {
      const result = await submitSuitability(answers as Record<string, string>);
      if (!result.received) {
        toast.message(suitabilityCopy.unavailable);
        onDone?.();
        return;
      }
      toast.success(suitabilityCopy.saved);
      setSaved(true);
    } catch {
      toast.error(suitabilityCopy.unavailable);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeguardingSurface className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 py-10 md:max-w-xl">
      <Helmet>
        <title>Private questions - Collabor8</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="mb-2 text-3xl font-bold text-foreground">{suitabilityCopy.title}</h1>
      <p className="mb-4 text-foreground">{suitabilityCopy.intro}</p>
      <p className="mb-8 text-sm text-foreground">{suitabilityCopy.reportExplainer}</p>
      {saved ? (
        <div className="space-y-4">
          {outcomes.pause && <SafetyNotice showReport={false} />}
          {outcomes.moneyGuidance && <CmsGuidance onDownload={() => void downloadRecord()} />}
          {outcomes.securityCheck && !showSecurity && (
            <Button type="button" variant="outline" className="min-h-11 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => setShowSecurity(true)}>
              {securityCheckCopy.offer}
            </Button>
          )}
          {showSecurity && <QuietAndSecurity quiet={false} preview={preview} securityOnly />}
          <Button className="min-h-11 w-full" onClick={() => onDone?.()}>{suitabilityCopy.done}</Button>
        </div>
      ) : (
        <>
          <div className="space-y-6">
            {SUITABILITY_QUESTIONS.map((question, index) => (
              <fieldset key={question.key} className="space-y-2">
                <legend className="text-sm font-medium text-foreground">{index + 1}. {question.prompt}</legend>
                <div className="grid gap-2">
                  {question.options.map((option) => {
                    const selected = answers[question.key] === option.key;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setAnswers((prev) => ({ ...prev, [question.key]: option.key }))}
                        className={`min-h-11 rounded-2xl border px-4 py-3 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${selected ? "border-foreground bg-card text-foreground" : "border-border bg-card text-foreground"}`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <Button className="mt-8 min-h-11 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" size="lg" disabled={!complete || saving} onClick={() => void save()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : suitabilityCopy.continue}
          </Button>
        </>
      )}
    </SafeguardingSurface>
  );
}
