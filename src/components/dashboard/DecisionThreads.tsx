import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft, Plus, Clock, Check, Send, Paperclip, Camera, Receipt, Info, X, Loader2, Wand2,
  CheckCircle2, Eye, Bell, AlertTriangle, ChevronRight, FileText, Undo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import RewriteComposer from "./RewriteComposer";
import {
  CATEGORIES, PRIORITIES, DecisionThread, ThreadEvent, addEvent, categoryLabel, deadlineSoon,
  effectiveStatus, eventLabel, needsMyResponse, priorityLabel, statusMeta, useThreads, RESPONSE_KINDS,
} from "@/lib/threads";

interface Props {
  userId: string;
  coparentId: string;
  coparentName: string;
}

const fmt = (d: string) => format(new Date(d), "d MMM, HH:mm");

export const StatusPill = ({ t }: { t: DecisionThread }) => {
  const m = statusMeta(effectiveStatus(t), deadlineSoon(t));
  return <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", m.cls)}>{m.label}</span>;
};

const DecisionThreads = ({ userId, coparentId, coparentName }: Props) => {
  const { threads, events, loading, reload } = useThreads(userId);
  const [params, setParams] = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(params.get("thread"));
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState<"active" | "all">("active");

  useEffect(() => {
    const id = params.get("thread");
    if (id) {
      setOpenId(id);
      params.delete("thread");
      setParams(params, { replace: true });
    }
  }, [params, setParams]);

  const byThread = useMemo(() => {
    const m: Record<string, ThreadEvent[]> = {};
    for (const e of events) (m[e.thread_id] ??= []).push(e);
    return m;
  }, [events]);

  const open = threads.find((t) => t.id === openId);
  if (open) {
    return (
      <ThreadDetail
        thread={open}
        events={byThread[open.id] ?? []}
        userId={userId}
        coparentName={coparentName}
        onBack={() => setOpenId(null)}
        reload={reload}
      />
    );
  }

  const list = threads.filter((t) => {
    const s = effectiveStatus(t);
    return filter === "all" || (s !== "resolved");
  });

  return (
    <div className="flex-1 overflow-y-auto pb-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
          {(["active", "all"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("rounded-full px-3 py-1", filter === f ? "bg-foreground text-background" : "text-muted-foreground")}>
              {f === "active" ? "Unresolved" : "All"}
            </button>
          ))}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> New decision
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="font-medium text-foreground">No decisions here yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Start a thread for one matter - like "Saturday pickup" - so the decision doesn't get lost in chat.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((t) => {
            const mine = needsMyResponse(t, byThread[t.id] ?? [], userId);
            return (
              <button key={t.id} onClick={() => setOpenId(t.id)}
                className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent/10">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill t={t} />
                    {mine && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-foreground">Your turn</span>}
                    {t.priority !== "normal" && <span className="text-[11px] text-muted-foreground">{priorityLabel(t.priority)}</span>}
                  </div>
                  <p className="mt-1.5 truncate font-semibold text-foreground">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {categoryLabel(t.category)}
                    {t.children.length > 0 && ` · ${t.children.join(", ")}`}
                    {t.deadline && ` · Reply by ${fmt(t.deadline)}`}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}

      <NewThreadSheet open={creating} onOpenChange={setCreating} userId={userId} coparentId={coparentId}
        onCreated={(id) => { reload(); setOpenId(id); }} />
    </div>
  );
};

/* ---------------- New thread ---------------- */

const NewThreadSheet = ({ open, onOpenChange, userId, coparentId, onCreated }: {
  open: boolean; onOpenChange: (o: boolean) => void; userId: string; coparentId: string; onCreated: (id: string) => void;
}) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("schedule");
  const [priority, setPriority] = useState("normal");
  const [deadline, setDeadline] = useState("");
  const [children, setChildren] = useState("");
  const [request, setRequest] = useState("");
  const [requireAck, setRequireAck] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);

  const reset = () => { setTitle(""); setRequest(""); setDeadline(""); setChildren(""); setRequireAck(false); setPriority("normal"); };

  const submit = async () => {
    if (!title.trim() || !request.trim()) return toast.error("Add a topic and what you're asking for");
    setSaving(true);
    const { data, error } = await supabase.from("decision_threads" as any).insert({
      creator_id: userId, coparent_id: coparentId, title: title.trim(), category, priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      children: children.split(",").map((c) => c.trim()).filter(Boolean),
      require_ack: requireAck, original_request: request.trim(), next_action: "Reply to the request",
    } as any).select("id").single();
    if (error || !data) { setSaving(false); return toast.error("Could not start the thread"); }
    const id = (data as any).id as string;
    await addEvent({ thread_id: id, actor_id: userId, kind: "created", body: request.trim() });
    setSaving(false);
    reset();
    onOpenChange(false);
    toast.success("Decision thread sent");
    onCreated(id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>New decision</SheetTitle>
          <SheetDescription>One matter per thread keeps things clear for both of you.</SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Topic</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Saturday pickup" maxLength={80} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{categoryLabel(c)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p}>{priorityLabel(p)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Reply by (optional)</label>
              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Child or children</label>
              <Input value={children} onChange={(e) => setChildren(e.target.value)} placeholder="e.g. Mia, Leo" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs text-muted-foreground">What are you asking for?</label>
              <button disabled={!request.trim()} onClick={() => setRewriteOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-foreground disabled:opacity-40">
                <Wand2 className="h-3.5 w-3.5 text-primary" /> Rewrite calmly
              </button>
            </div>
            <Textarea value={request} onChange={(e) => setRequest(e.target.value)} rows={3}
              placeholder="e.g. Could we move Saturday pickup to 11am at the school gate?" />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
            <span>
              <span className="block text-sm font-medium text-foreground">Require acknowledgement</span>
              <span className="block text-xs text-muted-foreground">Your co-parent is asked to confirm they've seen it.</span>
            </span>
            <Switch checked={requireAck} onCheckedChange={setRequireAck} />
          </label>
          <Button className="w-full" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send decision request"}
          </Button>
        </div>
        <RewriteComposer open={rewriteOpen} draft={request} onOpenChange={setRewriteOpen} onUse={setRequest} />
      </SheetContent>
    </Sheet>
  );
};

/* ---------------- Thread detail ---------------- */

const ThreadDetail = ({ thread: t, events, userId, coparentName, onBack, reload }: {
  thread: DecisionThread; events: ThreadEvent[]; userId: string; coparentName: string; onBack: () => void; reload: () => void;
}) => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [proposeOpen, setProposeOpen] = useState(false);
  const [proposal, setProposal] = useState("");
  const [statusFor, setStatusFor] = useState<ThreadEvent | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [view, setView] = useState<"messages" | "timeline">("messages");
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const status = effectiveStatus(t);
  const done = status === "resolved";
  const other = (id: string) => (id === userId ? "You" : coparentName);

  // Record a "viewed" event when there is something new from the other parent
  useEffect(() => {
    const lastOther = [...events].reverse().find((e) => e.actor_id !== userId && e.kind !== "viewed");
    const lastMyView = [...events].reverse().find((e) => e.actor_id === userId && e.kind === "viewed");
    if (lastOther && (!lastMyView || lastMyView.created_at < lastOther.created_at)) {
      addEvent({ thread_id: t.id, actor_id: userId, kind: "viewed" });
    }
  }, [events, t.id, userId]);

  const act = async (kind: string, body?: string | null, extra?: Partial<ThreadEvent>) => {
    setBusy(true);
    const { error } = await addEvent({ thread_id: t.id, actor_id: userId, kind, body: body ?? null, ...extra });
    setBusy(false);
    if (error) toast.error("Could not save that - please try again");
    else reload();
    return !error;
  };

  const sendMessage = async () => {
    if (!draft.trim()) return;
    if (await act("message", draft.trim())) setDraft("");
  };

  const upload = async (f: File) => {
    if (f.size > 10 * 1024 * 1024) return toast.error("Files must be under 10MB");
    const path = `${userId}/threads/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    setBusy(true);
    const { error } = await supabase.storage.from("chat-attachments").upload(path, f);
    setBusy(false);
    if (error) return toast.error("Could not attach that file");
    await act("attach", null, { attachment_path: path, attachment_name: f.name });
  };

  const openFile = async (path: string) => {
    const { data } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    else toast.error("Could not open that file");
  };

  const iAmRecipient = t.creator_id !== userId;
  const myResponses = events.filter((e) => e.actor_id === userId && RESPONSE_KINDS.includes(e.kind));
  const theirResponses = events.filter((e) => e.actor_id !== userId && RESPONSE_KINDS.includes(e.kind));
  const lastResp = (arr: ThreadEvent[]) => arr[arr.length - 1];
  const visible = events.filter((e) => e.kind !== "viewed");
  const chatItems = visible.filter((e) => ["created", "message", "attach", "propose", "info", "decline", "confirm", "ack"].includes(e.kind));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto pb-3">
        <button onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All decisions
        </button>

        {/* Summary */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill t={t} />
            <span className="text-[11px] text-muted-foreground">{categoryLabel(t.category)} · {priorityLabel(t.priority)}</span>
            {t.require_ack && (
              <span className={cn("text-[11px]", t.acknowledged_at ? "text-status-ok" : "text-muted-foreground")}>
                · {t.acknowledged_at ? `Acknowledged ${fmt(t.acknowledged_at)}` : "Acknowledgement required"}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-bold text-foreground">{t.title}</h3>
          {t.children.length > 0 && <p className="text-xs text-muted-foreground">For {t.children.join(", ")}</p>}

          <dl className="mt-3 space-y-2 text-sm">
            <Row label="Original request" value={t.original_request} />
            {t.current_proposal && <Row label="Current proposal" value={t.current_proposal} />}
            <Row label="You" value={lastResp(myResponses) ? eventLabel[lastResp(myResponses).kind] : "No response yet"} />
            <Row label={coparentName} value={lastResp(theirResponses) ? eventLabel[lastResp(theirResponses).kind] : "No response yet"} />
            {t.final_outcome && <Row label="Agreed outcome" value={t.final_outcome} strong />}
            {(t.next_action || t.deadline) && !done && status !== "confirmed" && (
              <Row label="Next step" value={`${t.next_action ?? "Reply"}${t.deadline ? ` - by ${fmt(t.deadline)}` : ""}`} />
            )}
          </dl>
          {status === "expired" && (
            <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-status-overdue/10 px-2.5 py-1.5 text-xs text-status-overdue">
              <AlertTriangle className="h-3.5 w-3.5" /> The reply-by time has passed without an agreement.
            </p>
          )}
        </div>

        {/* Response actions */}
        {!done && status !== "confirmed" && (
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Respond</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => act("confirm")}><Check className="h-4 w-4" /> Confirm</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => { setProposal(t.current_proposal ?? t.original_request); setProposeOpen(true); }}>Propose a change</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act("info", draft.trim() || null)}>Need more info</Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={() => act("decline", draft.trim() || null)}>Decline</Button>
              {iAmRecipient && t.require_ack && !t.acknowledged_at && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => act("ack")}>Acknowledge receipt</Button>
              )}
            </div>
          </div>
        )}
        <div className="mt-2 flex justify-end">
          {done ? (
            <button onClick={() => act("reopen")} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"><Undo2 className="h-3.5 w-3.5" /> Reopen</button>
          ) : (
            <button onClick={() => act("resolve")} className="text-xs text-muted-foreground underline-offset-2 hover:underline">Mark as resolved</button>
          )}
        </div>

        {/* Messages / timeline */}
        <div className="mt-3 inline-flex rounded-full border border-border bg-card p-0.5 text-xs">
          {(["messages", "timeline"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn("rounded-full px-3 py-1", view === v ? "bg-foreground text-background" : "text-muted-foreground")}>
              {v === "messages" ? "Messages" : "Activity timeline"}
            </button>
          ))}
        </div>

        {view === "timeline" ? (
          <ol className="mt-3 space-y-0 border-l border-border pl-4">
            {events.map((e) => (
              <li key={e.id} className="relative pb-3">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-primary" />
                <p className="text-sm text-foreground"><span className="font-medium">{other(e.actor_id)}</span> - {eventLabel[e.kind] ?? e.kind}</p>
                <p className="text-[11px] text-muted-foreground">{format(new Date(e.created_at), "EEE d MMM yyyy, HH:mm:ss")}</p>
              </li>
            ))}
            <p className="text-[11px] text-muted-foreground">This record can't be edited or deleted by either parent.</p>
          </ol>
        ) : (
          <div className="mt-3 space-y-3">
            {chatItems.map((e) => {
              const mine = e.actor_id === userId;
              return (
                <div key={e.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                  <div className="max-w-[82%]">
                    {e.kind !== "message" && e.kind !== "attach" && (
                      <p className={cn("mb-0.5 text-[11px] font-medium text-muted-foreground", mine && "text-right")}>{eventLabel[e.kind]}</p>
                    )}
                    <div className={cn("px-4 py-2.5 text-sm", mine ? "rounded-2xl rounded-br-md bg-foreground text-background" : "rounded-2xl rounded-bl-md border border-border bg-card text-foreground")}>
                      {e.body ?? (e.kind === "attach" ? "" : eventLabel[e.kind])}
                      {e.attachment_path && (
                        <button onClick={() => openFile(e.attachment_path!)} className={cn("mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs", mine ? "bg-background/15" : "bg-muted")}>
                          <FileText className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{e.attachment_name}</span>
                        </button>
                      )}
                      {e.expense_id && <ExpensePreview id={e.expense_id} onOpen={() => navigate("/dashboard?tab=expenses")} mine={mine} />}
                    </div>
                    <button onClick={() => setStatusFor(e)} className={cn("mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground", mine ? "ml-auto" : "")}>
                      {fmt(e.created_at)} · <DeliveryHint e={e} events={events} mine={mine} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Composer */}
      {!done && (
        <div className="border-t border-border pt-2 pb-4">
          <div className="mb-2 flex items-center gap-3 text-xs">
            <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Paperclip className="h-3.5 w-3.5" /> Document</button>
            <button onClick={() => photoRef.current?.click()} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Camera className="h-3.5 w-3.5" /> Photo</button>
            <button onClick={() => setLinkOpen(true)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><Receipt className="h-3.5 w-3.5" /> Expense</button>
            <button disabled={!draft.trim()} onClick={() => setRewriteOpen(true)} className="ml-auto inline-flex items-center gap-1 font-medium text-foreground disabled:opacity-40"><Wand2 className="h-3.5 w-3.5 text-primary" /> Rewrite calmly</button>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
          <div className="flex items-end gap-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={2} placeholder="Add a message to this decision…" className="min-h-[48px] flex-1 resize-none rounded-2xl bg-card" />
            <Button size="icon" className="h-12 w-12 shrink-0" onClick={sendMessage} disabled={!draft.trim() || busy} aria-label="Send">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      )}

      <RewriteComposer open={rewriteOpen} draft={draft} onOpenChange={setRewriteOpen} onUse={setDraft} />

      {/* Propose change */}
      <Sheet open={proposeOpen} onOpenChange={setProposeOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>Propose a change</SheetTitle>
            <SheetDescription>Suggest a new time, date, amount or plan. Keep it to the practical details.</SheetDescription>
          </SheetHeader>
          <Textarea className="mt-3" rows={3} value={proposal} onChange={(e) => setProposal(e.target.value)} />
          <Button className="mt-3 w-full" disabled={!proposal.trim() || busy}
            onClick={async () => { if (await act("propose", proposal.trim())) setProposeOpen(false); }}>
            Send proposal
          </Button>
        </SheetContent>
      </Sheet>

      <DeliverySheet e={statusFor} events={events} thread={t} userId={userId} coparentName={coparentName} onClose={() => setStatusFor(null)} />
      <LinkExpenseSheet open={linkOpen} onOpenChange={setLinkOpen}
        onPick={async (id, label) => { if (await act("attach", label, { expense_id: id })) setLinkOpen(false); }}
        onCreate={() => navigate("/dashboard?tab=expenses")} />
    </div>
  );
};

const Row = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="grid grid-cols-[110px_1fr] gap-2">
    <dt className="text-xs text-muted-foreground">{label}</dt>
    <dd className={cn("text-sm text-foreground", strong && "font-semibold")}>{value}</dd>
  </div>
);

function firstAfter(events: ThreadEvent[], e: ThreadEvent, pred: (x: ThreadEvent) => boolean) {
  return events.find((x) => x.created_at >= e.created_at && x.id !== e.id && pred(x));
}

const DeliveryHint = ({ e, events, mine }: { e: ThreadEvent; events: ThreadEvent[]; mine: boolean }) => {
  if (!mine) return <span>Details</span>;
  const seen = firstAfter(events, e, (x) => x.kind === "viewed" && x.actor_id !== e.actor_id);
  return seen ? <span className="inline-flex items-center gap-0.5 text-status-ok"><Eye className="h-3 w-3" /> Seen</span> : <span className="inline-flex items-center gap-0.5"><Check className="h-3 w-3" /> Delivered</span>;
};

const DeliverySheet = ({ e, events, thread, userId, coparentName, onClose }: {
  e: ThreadEvent | null; events: ThreadEvent[]; thread: DecisionThread; userId: string; coparentName: string; onClose: () => void;
}) => {
  if (!e) return null;
  const mine = e.actor_id === userId;
  const who = mine ? coparentName : "You";
  const viewed = firstAfter(events, e, (x) => x.kind === "viewed" && x.actor_id !== e.actor_id);
  const resp = firstAfter(events, e, (x) => x.actor_id !== e.actor_id && x.kind !== "viewed");
  const overdue = !!thread.deadline && new Date(thread.deadline) < new Date() && !resp;
  const steps = [
    { icon: Send, done: true, title: "Sent", text: fmt(e.created_at) },
    { icon: CheckCircle2, done: true, title: "Delivered", text: `Saved securely and placed in ${mine ? `${coparentName}'s` : "your"} app` },
    { icon: Bell, done: true, title: "Alert sent", text: `${who === "You" ? "You were" : `${coparentName} was`} notified in the app and by email` },
    { icon: Eye, done: !!viewed, title: "Viewed", text: viewed ? `${who} opened it ${fmt(viewed.created_at)}` : "Not opened yet" },
    { icon: Info, done: !!resp, title: "Response", text: resp ? `${eventLabel[resp.kind]} - ${fmt(resp.created_at)}` : "No reply yet" },
  ];
  if (thread.require_ack) steps.push({ icon: Check, done: !!thread.acknowledged_at, title: "Acknowledgement", text: thread.acknowledged_at ? `Acknowledged ${fmt(thread.acknowledged_at)}` : "Waiting for acknowledgement" });
  if (overdue) steps.push({ icon: AlertTriangle, done: false, title: "Deadline passed", text: `No reply by ${fmt(thread.deadline!)}. Marked as overdue for both of you.` });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>What happened to this message</SheetTitle>
          <SheetDescription className="line-clamp-2">{e.body ?? e.attachment_name ?? eventLabel[e.kind]}</SheetDescription>
        </SheetHeader>
        <ol className="mt-4 space-y-3">
          {steps.map((s) => (
            <li key={s.title} className="flex items-start gap-3">
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                s.title === "Deadline passed" ? "bg-status-overdue/10 text-status-overdue" : s.done ? "bg-status-ok/10 text-status-ok" : "bg-muted text-muted-foreground")}>
                <s.icon className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </SheetContent>
    </Sheet>
  );
};

const ExpensePreview = ({ id, onOpen, mine }: { id: string; onOpen: () => void; mine: boolean }) => {
  const [x, setX] = useState<{ description: string; amount: number; status: string } | null>(null);
  useEffect(() => {
    supabase.from("expense_requests").select("description, amount, status").eq("id", id).maybeSingle().then(({ data }) => setX(data as any));
  }, [id]);
  return (
    <button onClick={onOpen} className={cn("mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs", mine ? "bg-background/15" : "bg-muted")}>
      <Receipt className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{x ? `${x.description} - £${Number(x.amount).toFixed(2)}` : "Expense"}</span>
      {x && <span className="capitalize opacity-80">{x.status}</span>}
    </button>
  );
};

const LinkExpenseSheet = ({ open, onOpenChange, onPick, onCreate }: {
  open: boolean; onOpenChange: (o: boolean) => void; onPick: (id: string, label: string) => void; onCreate: () => void;
}) => {
  const [items, setItems] = useState<{ id: string; description: string; amount: number; status: string; created_at: string }[]>([]);
  useEffect(() => {
    if (!open) return;
    supabase.from("expense_requests").select("id, description, amount, status, created_at").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => setItems((data ?? []) as any));
  }, [open]);
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Link an expense</SheetTitle>
          <SheetDescription>Pick an existing expense request so nothing is entered twice.</SheetDescription>
        </SheetHeader>
        <div className="mt-3 space-y-2">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No expense requests yet.</p>}
          {items.map((i) => (
            <button key={i.id} onClick={() => onPick(i.id, `Linked expense: ${i.description} - £${Number(i.amount).toFixed(2)}`)}
              className="flex w-full items-center justify-between rounded-xl border border-border bg-card p-3 text-left text-sm hover:bg-accent/10">
              <span className="truncate">{i.description}</span>
              <span className="shrink-0 text-muted-foreground">£{Number(i.amount).toFixed(2)} · {formatDistanceToNow(new Date(i.created_at))} ago</span>
            </button>
          ))}
          <Button variant="outline" className="w-full" onClick={onCreate}>Create a new expense request</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default DecisionThreads;
