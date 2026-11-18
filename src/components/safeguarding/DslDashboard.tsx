import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { dslCopy } from "@/content/safeguarding";
import { setPairPause, type DslConcern, type DslFlag } from "@/lib/safeguarding/api";
import { SafeguardingSurface } from "@/components/safeguarding/SafeguardingSurface";

function pairLabel(a: string | null, b: string | null) {
  const left = a ? a.slice(0, 8) : "unlinked";
  const right = b ? b.slice(0, 8) : "unlinked";
  return `${dslCopy.pair} ${left} / ${right}`;
}

export function DslDashboard({
  allowed,
  flags,
  concerns,
  preview = false,
  onChange,
}: {
  allowed: boolean;
  flags: DslFlag[];
  concerns: DslConcern[];
  preview?: boolean;
  onChange?: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  const pause = async (flag: { parentA: string | null; parentB: string | null }, next: boolean, id: string) => {
    if (preview) return;
    setBusy(id);
    try {
      await setPairPause(flag.parentA, flag.parentB, next);
      onChange?.();
    } catch {
      toast.error(dslCopy.noAccess);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeguardingSurface>
      <main className="mx-auto min-h-screen max-w-3xl bg-background px-6 py-10">
        <Helmet>
          <title>Safeguarding review - Collabor8</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1 className="text-2xl font-semibold text-foreground">{dslCopy.title}</h1>
        <p className="mt-2 text-sm text-foreground">{dslCopy.intro}</p>
        {!allowed ? (
          <p className="mt-8 text-foreground">{dslCopy.noAccess}</p>
        ) : (
          <div className="mt-8 space-y-8">
            <section>
              <h2 className="mb-3 text-sm font-medium text-foreground">{dslCopy.flags}</h2>
              {flags.length === 0 ? <p className="text-sm text-foreground">{dslCopy.emptyFlags}</p> : (
                <div className="space-y-3">
                  {flags.map((flag) => (
                    <article key={flag.id} className="rounded-2xl border border-border bg-card p-4">
                      <p className="font-medium text-foreground">{pairLabel(flag.parentA, flag.parentB)}</p>
                      <p className="mt-1 text-xs text-foreground">{flag.createdAt}</p>
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" className="min-h-11" disabled={busy === flag.id} onClick={() => void pause(flag, true, flag.id)}>
                          {busy === flag.id ? <Loader2 className="h-4 w-4 animate-spin" /> : dslCopy.pause}
                        </Button>
                        <Button size="sm" variant="outline" className="min-h-11" disabled={busy === flag.id} onClick={() => void pause(flag, false, flag.id)}>
                          {dslCopy.lift}
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="mb-3 text-sm font-medium text-foreground">{dslCopy.concerns}</h2>
              {concerns.length === 0 ? <p className="text-sm text-foreground">{dslCopy.emptyConcerns}</p> : (
                <div className="space-y-3">
                  {concerns.map((concern) => (
                    <article key={concern.id} className="rounded-2xl border border-border bg-card p-4">
                      <p className="font-medium text-foreground">{pairLabel(concern.parentA, concern.parentB)}</p>
                      <p className="mt-1 text-xs text-foreground">{concern.category} · {concern.status} · {concern.createdAt}</p>
                      {concern.body && <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{concern.body}</p>}
                      <Button size="sm" variant="outline" className="mt-3 min-h-11" disabled={busy === concern.id} onClick={() => void pause(concern, true, concern.id)}>
                        {dslCopy.pause}
                      </Button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </SafeguardingSurface>
  );
}
