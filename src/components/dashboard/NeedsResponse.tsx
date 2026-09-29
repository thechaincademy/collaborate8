import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ChevronRight, CalendarClock } from "lucide-react";
import { effectiveStatus, needsMyResponse, useThreads } from "@/lib/threads";
import { StatusPill } from "./DecisionThreads";

const NeedsResponse = ({ userId }: { userId?: string }) => {
  const navigate = useNavigate();
  const { threads, events, loading } = useThreads(userId);

  const { needs, upcoming, unresolved } = useMemo(() => {
    const ev = (id: string) => events.filter((e) => e.thread_id === id);
    const active = threads.filter((t) => !["resolved"].includes(effectiveStatus(t)));
    return {
      needs: active.filter((t) => userId && needsMyResponse(t, ev(t.id), userId)),
      upcoming: threads
        .filter((t) => t.category === "schedule" && t.deadline && new Date(t.deadline) > new Date() && t.status !== "resolved")
        .sort((a, b) => a.deadline!.localeCompare(b.deadline!))
        .slice(0, 3),
      unresolved: active.length,
    };
  }, [threads, events, userId]);

  if (loading || threads.length === 0) return null;
  if (needs.length === 0 && upcoming.length === 0) return null;
  const open = (id: string) => navigate(`/dashboard?tab=chat&thread=${id}`);

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Needs your response</h3>
        <span className="text-xs text-muted-foreground">{unresolved} unresolved</span>
      </div>
      {needs.length === 0 ? (
        <p className="text-sm text-muted-foreground">You're up to date - nothing is waiting on you.</p>
      ) : (
        <div className="space-y-1">
          {needs.slice(0, 4).map((t) => (
            <button key={t.id} onClick={() => open(t.id)} className="flex w-full items-center gap-2 rounded-xl p-2 text-left hover:bg-muted">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{t.title}</p>
                {t.deadline && <p className="text-[11px] text-muted-foreground">Reply by {format(new Date(t.deadline), "d MMM, HH:mm")}</p>}
              </div>
              <StatusPill t={t} />
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}
      {upcoming.length > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Upcoming exchanges</p>
          {upcoming.map((t) => (
            <button key={t.id} onClick={() => open(t.id)} className="flex w-full items-center gap-2 rounded-xl p-2 text-left text-sm hover:bg-muted">
              <CalendarClock className="h-4 w-4 text-primary" />
              <span className="flex-1 truncate text-foreground">{t.title}</span>
              <span className="text-xs text-muted-foreground">{format(new Date(t.deadline!), "EEE d MMM")}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NeedsResponse;
