import { useEffect, useState } from "react";
import { Loader2, Wand2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  draft: string;
  onOpenChange: (o: boolean) => void;
  onUse: (text: string) => void;
}

/** Optional, private writing aid. Never sends anything itself. */
const RewriteComposer = ({ open, draft, onOpenChange, onUse }: Props) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<{ tone: string; text: string }[]>([]);
  const [changes, setChanges] = useState("");
  const [showWhy, setShowWhy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !draft.trim()) return;
    setLoading(true);
    setOptions([]);
    setError("");
    setShowWhy(false);
    supabase.functions
      .invoke("chat-rewrite", { body: { draft } })
      .then(({ data, error }) => {
        if (error || (data as any)?.error) setError((data as any)?.error ?? "The writing aid is unavailable right now.");
        else {
          setOptions((data as any)?.options ?? []);
          setChanges((data as any)?.changes ?? "");
        }
      })
      .finally(() => setLoading(false));
  }, [open, draft]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-primary" /> Rewrite calmly
          </DialogTitle>
          <DialogDescription>
            Private to you. Nothing is sent until you choose to send it.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl bg-muted p-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your draft</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{draft}</p>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Writing three calmer versions…
          </div>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="space-y-2">
          {options.map((o) => (
            <div key={o.tone} className="rounded-xl border border-border bg-card p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{o.tone}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{o.text}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => { onUse(o.text); onOpenChange(false); }}>
                Use this version
              </Button>
            </div>
          ))}
        </div>

        {options.length > 0 && changes && (
          <div>
            <button className="text-xs text-muted-foreground underline underline-offset-2" onClick={() => setShowWhy((v) => !v)}>
              {showWhy ? "Hide explanation" : "What changed?"}
            </button>
            {showWhy && <p className="mt-1 text-xs text-foreground/80">{changes}</p>}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <p className="text-[11px] leading-snug text-muted-foreground">
            A writing aid only - not legal advice or mediation.
          </p>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>Keep my version</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RewriteComposer;
