import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ThreadStatus = "open" | "awaiting" | "confirmed" | "proposed" | "resolved" | "expired";

export interface DecisionThread {
  id: string;
  creator_id: string;
  coparent_id: string;
  title: string;
  category: string;
  priority: string;
  deadline: string | null;
  children: string[];
  require_ack: boolean;
  status: string;
  original_request: string;
  current_proposal: string | null;
  final_outcome: string | null;
  next_action: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ThreadEvent {
  id: string;
  thread_id: string;
  actor_id: string;
  kind: string;
  body: string | null;
  expense_id: string | null;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
}

export const CATEGORIES = ["schedule", "health", "school", "expense", "childcare", "travel", "other"] as const;
export const PRIORITIES = ["normal", "important", "time_sensitive"] as const;

export const categoryLabel = (c: string) => c.charAt(0).toUpperCase() + c.slice(1);
export const priorityLabel = (p: string) =>
  p === "time_sensitive" ? "Time-sensitive" : p === "important" ? "Important" : "Normal";

export const RESPONSE_KINDS = ["confirm", "propose", "info", "decline", "ack"];

export const eventLabel: Record<string, string> = {
  created: "Started the thread",
  message: "Sent a message",
  viewed: "Viewed",
  confirm: "Confirmed",
  propose: "Proposed a change",
  info: "Asked for more information",
  decline: "Declined",
  ack: "Acknowledged receipt",
  resolve: "Marked as resolved",
  reopen: "Reopened the thread",
  attach: "Attached an item",
};

export function effectiveStatus(t: DecisionThread): ThreadStatus {
  if (t.status === "resolved" || t.status === "confirmed") return t.status;
  if (t.deadline && new Date(t.deadline).getTime() < Date.now()) return "expired";
  return t.status as ThreadStatus;
}

export const deadlineSoon = (t: DecisionThread) =>
  !!t.deadline &&
  new Date(t.deadline).getTime() > Date.now() &&
  new Date(t.deadline).getTime() - Date.now() < 48 * 3600 * 1000;

export function statusMeta(s: ThreadStatus, soon = false) {
  switch (s) {
    case "confirmed":
      return { label: "Confirmed", cls: "bg-status-ok/10 text-status-ok border-status-ok/30" };
    case "resolved":
      return { label: "Resolved", cls: "bg-status-ok/10 text-status-ok border-status-ok/30" };
    case "expired":
      return { label: "Overdue", cls: "bg-status-overdue/10 text-status-overdue border-status-overdue/30" };
    case "proposed":
      return soon
        ? { label: "Change proposed", cls: "bg-status-soon/10 text-status-soon border-status-soon/30" }
        : { label: "Change proposed", cls: "bg-status-awaiting/10 text-status-awaiting border-status-awaiting/30" };
    case "awaiting":
      return soon
        ? { label: "Deadline soon", cls: "bg-status-soon/10 text-status-soon border-status-soon/30" }
        : { label: "Awaiting response", cls: "bg-status-awaiting/10 text-status-awaiting border-status-awaiting/30" };
    default:
      return { label: "Open", cls: "bg-muted text-foreground/70 border-border" };
  }
}

/** Does the given user owe the next move on this thread? */
export function needsMyResponse(t: DecisionThread, events: ThreadEvent[], me: string) {
  const s = effectiveStatus(t);
  if (s === "resolved" || s === "confirmed") return false;
  if (t.require_ack && !t.acknowledged_at && t.creator_id !== me) return true;
  const last = [...events].reverse().find((e) => e.kind !== "viewed");
  return !!last && last.actor_id !== me;
}

export function useThreads(userId?: string) {
  const [threads, setThreads] = useState<DecisionThread[]>([]);
  const [events, setEvents] = useState<ThreadEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    const [{ data: t }, { data: e }] = await Promise.all([
      supabase.from("decision_threads" as any).select("*").order("updated_at", { ascending: false }),
      supabase.from("thread_events" as any).select("*").order("created_at", { ascending: true }).limit(1000),
    ]);
    setThreads((t ?? []) as unknown as DecisionThread[]);
    setEvents((e ?? []) as unknown as ThreadEvent[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    load();
    const ch = supabase
      .channel(`threads:${userId}:${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "decision_threads" }, () => load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "thread_events" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, load]);

  return { threads, events, loading, reload: load };
}

export async function addEvent(ev: Partial<ThreadEvent> & { thread_id: string; actor_id: string; kind: string }) {
  return supabase.from("thread_events" as any).insert(ev as any);
}
