import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
}

const triggers: { pattern: RegExp; score: number }[] = [
  { pattern: /you always/i, score: 0.75 },
  { pattern: /you never/i, score: 0.75 },
  { pattern: /that'?s? a lie|that is a lie/i, score: 0.9 },
  { pattern: /ridiculous|absurd/i, score: 0.65 },
  { pattern: /you don'?t care/i, score: 0.7 },
  { pattern: /!!+/, score: 0.6 },
  { pattern: /[A-Z]{4,}/, score: 0.65 },
  { pattern: /stop ignoring/i, score: 0.8 },
  { pattern: /typical/i, score: 0.7 },
];

function scoreTone(text: string): number {
  if (!text.trim()) return 0;
  let s = 0;
  for (const t of triggers) if (t.pattern.test(text) && t.score > s) s = t.score;
  return s;
}

function toneLabel(score: number): { label: string; tone: "calm" | "tense" | "heated" | "very" } {
  const pct = score * 100;
  if (pct < 30) return { label: "Calm", tone: "calm" };
  if (pct < 60) return { label: "Tense", tone: "tense" };
  if (pct < 80) return { label: "Heated", tone: "heated" };
  return { label: "Very heated", tone: "very" };
}

const ChatTab = () => {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const coparentId = profile?.coparent_id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [intercept, setIntercept] = useState<{ draft: string; suggestion: string } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const toneScore = useMemo(() => scoreTone(draft), [draft]);
  const tone = toneLabel(toneScore);

  // Load + subscribe
  useEffect(() => {
    if (!user || !coparentId) {
      setLoading(false);
      return;
    }
    let active = true;

    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${coparentId}),and(sender_id.eq.${coparentId},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(200);
      if (active) {
        if (error) toast.error("Could not load messages");
        else setMessages((data ?? []) as Message[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          if (
            (m.sender_id === user.id && m.recipient_id === coparentId) ||
            (m.sender_id === coparentId && m.recipient_id === user.id)
          ) {
            setMessages((prev) => (prev.some((p) => p.id === m.id) ? prev : [...prev, m]));
          }
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user, coparentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, intercept]);

  const insertMessage = async (body: string, opts?: { original?: string; usedSuggestion?: boolean }) => {
    if (!user || !coparentId) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      recipient_id: coparentId,
      body,
      original_body: opts?.original ?? null,
      tone_score: opts?.original ? toneScore : null,
      used_suggestion: opts?.usedSuggestion ?? false,
    });
    setSending(false);
    if (error) {
      toast.error("Could not send message");
      return;
    }
    setDraft("");
    setIntercept(null);
  };

  const handleSendClick = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    if (toneScore >= 0.6) {
      setRewriting(true);
      try {
        const { data, error } = await supabase.functions.invoke("chat-rewrite", {
          body: { draft: text },
        });
        if (error) throw error;
        const suggestion = (data as { suggestion?: string })?.suggestion?.trim() || "";
        if (suggestion) {
          setIntercept({ draft: text, suggestion });
        } else {
          await insertMessage(text);
        }
      } catch {
        toast.error("Couldn't fetch a calmer version — sending as-is");
        await insertMessage(text);
      } finally {
        setRewriting(false);
      }
      return;
    }
    await insertMessage(text);
  };

  // -------- Render branches
  if (profileLoading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col px-6 pt-12">
        <DashboardHeader title="Chat" />
        <Skeleton className="mt-4 h-full w-full rounded-2xl" />
      </div>
    );
  }

  if (!coparentId) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col px-6 pt-12">
        <DashboardHeader title="Chat" />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <Send className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">No co-parent linked</h2>
          <p className="max-w-xs text-sm text-muted-foreground">
            Once you've linked with your co-parent, your conversation will appear here.
          </p>
        </div>
      </div>
    );
  }

  if (intercept) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col px-6 pt-12">
        <DashboardHeader title="Chat" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-1 flex-col items-center px-2 pt-4 text-center"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-5 w-5 text-foreground" />
          </div>
          <h2 className="mt-3 text-base font-semibold text-foreground">Take a breath</h2>
          <p className="mt-1 max-w-xs text-sm text-muted-foreground">
            This message might come across more strongly than you mean.
          </p>

          <div className="mt-5 w-full rounded-2xl border border-border bg-card p-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your message
            </p>
            <p className="mt-1.5 text-sm text-foreground">{intercept.draft}</p>
          </div>

          <div className="mt-3 w-full rounded-2xl border border-foreground/20 bg-foreground/5 p-4 text-left">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
              A calmer way to say it
            </p>
            <p className="mt-1.5 text-sm text-foreground">{intercept.suggestion}</p>
          </div>

          <div className="mt-5 flex w-full flex-col gap-2">
            <Button
              onClick={() => insertMessage(intercept.suggestion, { original: intercept.draft, usedSuggestion: true })}
              disabled={sending}
              className="w-full"
            >
              Use the calmer version
            </Button>
            <Button
              variant="outline"
              onClick={() => insertMessage(intercept.draft, { original: intercept.draft })}
              disabled={sending}
              className="w-full"
            >
              Send my message anyway
            </Button>
            <Button
              variant="ghost"
              onClick={() => setIntercept(null)}
              disabled={sending}
              className="w-full"
            >
              <ArrowLeft className="h-4 w-4" /> Back to edit
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  const tonePct = Math.max(5, Math.round(toneScore * 100));
  const toneColor =
    tone.tone === "calm"
      ? "text-muted-foreground"
      : tone.tone === "tense"
        ? "text-foreground/70"
        : "text-destructive";

  return (
    <div className="flex h-[calc(100vh-6rem)] flex-col px-6 pt-12">
      <DashboardHeader title="Chat" />

      <div className="mb-3 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-foreground/80">
          This chat tool uses AI to help co-parents maintain constructive discussions.
        </p>
      </div>



      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">
              No messages yet. Say hello.
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div className={cn("max-w-[78%]")}>
                    <div
                      className={cn(
                        "px-4 py-2.5 text-sm leading-relaxed",
                        mine
                          ? "rounded-2xl rounded-br-md bg-foreground text-background"
                          : "rounded-2xl rounded-bl-md border border-border bg-card text-foreground",
                      )}
                    >
                      {m.body}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[11px] text-muted-foreground",
                        mine ? "text-right" : "text-left",
                      )}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Tone meter */}
      <div className="pb-2 pt-1">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">Tone</span>
          <span className={cn("text-[11px] font-medium", toneColor)}>{tone.label}</span>
        </div>
        <div className="relative h-1 rounded-full bg-muted">
          <div
            className="absolute h-1 rounded-full bg-foreground transition-all duration-300"
            style={{ width: `${tonePct}%` }}
          />
          <div
            className="absolute -top-1.5 h-4 w-4 rounded-full border-2 border-foreground bg-background transition-all duration-300"
            style={{ left: `${tonePct}%`, transform: "translateX(-50%)" }}
          />
        </div>
        {toneScore >= 0.3 && (
          <p className={cn("mt-1.5 text-[11px]", toneColor)}>
            {toneScore >= 0.8
              ? "This message might be hard to receive. Take a breath?"
              : toneScore >= 0.6
                ? "Heads up — this might come across strongly."
                : "This might come across a little strongly."}
          </p>
        )}
      </div>

      <div className="flex items-end gap-2 pb-4">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendClick();
            }
          }}
          placeholder="Type a message…"
          rows={2}
          className="min-h-[48px] flex-1 resize-none rounded-2xl border-border bg-card text-foreground"
        />
        <Button
          onClick={handleSendClick}
          disabled={!draft.trim() || sending || rewriting}
          size="icon"
          className="h-12 w-12 shrink-0"
        >
          {rewriting || sending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
};

export default ChatTab;
