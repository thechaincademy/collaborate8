import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reportCopy } from "@/content/safeguarding";
import { reportConcern } from "@/lib/safeguarding/api";
import { SafeguardingSurface } from "@/components/safeguarding/SafeguardingSurface";
import { SafetyNotice } from "@/components/safeguarding/SafetyNotice";

const UUID = /^[0-9a-f-]{36}$/i;

export function ReportConcernForm({ preview = false }: { preview?: boolean }) {
  const [kind, setKind] = useState<"message" | "payment" | "expense" | "general">("general");
  const [targetId, setTargetId] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const submit = async () => {
    if (preview) {
      setReference("C8-7Q2K");
      return;
    }
    setSending(true);
    try {
      const result = await reportConcern({
        kind,
        targetId: UUID.test(targetId.trim()) ? targetId.trim() : null,
        note: note.trim() || null,
      });
      setReference(result.reference);
      toast.success(reportCopy.sent);
    } catch {
      toast.error(reportCopy.unavailable);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeguardingSurface className="mx-auto min-h-screen max-w-md bg-background px-6 py-10 md:max-w-xl">
      <Helmet>
        <title>Raise a concern - Collabor8</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1 className="mb-2 text-3xl font-bold text-foreground">{reportCopy.title}</h1>
      <p className="mb-6 text-foreground">{reportCopy.intro}</p>
      {reference ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground">{reportCopy.sent}</p>
          <p className="text-sm text-foreground">{reportCopy.reference} {reference}.</p>
          <SafetyNotice showReport={false} />
        </div>
      ) : (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-foreground">{reportCopy.categoryLabel}</legend>
            <div className="grid gap-2">
              {reportCopy.categories.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={kind === item.key}
                  onClick={() => setKind(item.key as typeof kind)}
                  className={`min-h-11 rounded-2xl border px-4 py-3 text-left text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${kind === item.key ? "border-foreground bg-card" : "border-border bg-card"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </fieldset>
          {kind !== "general" && (
            <label className="block text-sm font-medium text-foreground">
              {reportCopy.targetLabel}
              <Input className="mt-1 min-h-11" value={targetId} onChange={(event) => setTargetId(event.target.value)} />
            </label>
          )}
          <label className="block text-sm font-medium text-foreground">
            {reportCopy.bodyLabel}
            <Textarea className="mt-1" value={note} maxLength={2000} placeholder={reportCopy.bodyPlaceholder} onChange={(event) => setNote(event.target.value)} />
          </label>
          <Button className="min-h-11 w-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" size="lg" disabled={sending} onClick={() => void submit()} aria-label={reportCopy.button}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : reportCopy.submit}
          </Button>
        </div>
      )}
    </SafeguardingSurface>
  );
}
