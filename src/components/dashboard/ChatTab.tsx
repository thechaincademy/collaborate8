import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, Sparkles, Loader2, FileText, UserPlus, Download, Check, MessageCircle, FolderOpen } from "lucide-react";
import { downloadChatPdf } from "@/lib/chatPdf";
import DashboardHeader from "./DashboardHeader";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import ResendInviteLink, { INVITE_EVENT } from "./ResendInviteLink";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ConversationToolModal,
  ConversationToolSuggestionCard,
  ConversationEmailStep,
  useConversationToolModal,
} from "./ConversationToolPromo";

import ConversationQuestionnaire from "./ConversationQuestionnaire";
import RewriteComposer from "./RewriteComposer";
import DocumentsTab from "./DocumentsTab";

const DAY_MS = 24 * 60 * 60 * 1000;

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  attachment_path?: string | null;
  attachment_name?: string | null;
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

const SUBHEADING =
  "A dedicated space to discuss finances with your co-parent - separate from everything else.";

const ChatTab = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const coparentId = profile?.coparent_id ?? null;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [intercept, setIntercept] = useState<{ draft: string; suggestion: string } | null>(null);
  const [rewriting, setRewriting] = useState(false);
  const [sending, setSending] = useState(false);
  const [rewriteOpen, setRewriteOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<"chat" | "documents">("chat");
  const scrollRef = useRef<HTMLDivElement>(null);

  const sectionTabs = (
    <div className="mb-4 grid grid-cols-2 rounded-xl border border-border bg-muted/40 p-1" role="tablist" aria-label="Financial Chat sections">
      <Button
        type="button"
        role="tab"
        aria-selected={activeSection === "chat"}
        variant={activeSection === "chat" ? "default" : "ghost"}
        className="gap-2 rounded-lg"
        onClick={() => setActiveSection("chat")}
      >
        <MessageCircle className="h-4 w-4" />
        Chat
      </Button>
      <Button
        type="button"
        role="tab"
        aria-selected={activeSection === "documents"}
        variant={activeSection === "documents" ? "default" : "ghost"}
        className="gap-2 rounded-lg"
        onClick={() => setActiveSection("documents")}
      >
        <FolderOpen className="h-4 w-4" />
        Documents
      </Button>
    </div>
  );

  const handleDownload = async () => {
    if (!user || !coparentId) return;
    const [{ data: cp }, { data: exp }] = await Promise.all([
      supabase.from("profiles").select("first_name, last_name").eq("id", coparentId).maybeSingle(),
      supabase.from("expense_requests").select("description, amount, status, created_at, kind").eq("kind", "split_request").in("status", ["agreed", "rejected"]).order("created_at"),
    ]);
    const nm = (a?: string | null, b?: string | null, f = "") => `${a ?? ""} ${b ?? ""}`.trim() || f;
    downloadChatPdf({
      myId: user.id,
      myName: nm(profile?.first_name, profile?.last_name, "You"),
      coparentName: nm(cp?.first_name, cp?.last_name, "Co-parent"),
      messages,
      agreements: (exp ?? []) as any,
    });
  };

  const toneScore = useMemo(() => scoreTone(draft), [draft]);
  const tone = toneLabel(toneScore);

  const { open: toolOpen, setOpen: setToolOpen } = useConversationToolModal();
  const openTool = () => setToolOpen(true);
  const [questionnaireOpen, setQuestionnaireOpen] = useState(false);
  const [emailStepOpen, setEmailStepOpen] = useState(false);
  const [toolEmail, setToolEmail] = useState("");

  // Returning from Stripe Checkout for the conversation tool
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("conversation-tool");
    if (!result) return;

    const sessionId = params.get("session_id");
    const clean = () => {
      params.delete("conversation-tool");
      params.delete("session_id");
      const q = params.toString();
      window.history.replaceState({}, "", window.location.pathname + (q ? `?${q}` : ""));
    };

    if (result === "cancelled") {
      toast.info("Payment cancelled. You can unlock the tool whenever you are ready.");
      clean();
      return;
    }

    if (result === "success" && sessionId) {
      (async () => {
        const { data, error } = await supabase.functions.invoke("conversation-tool-access", {
          body: { action: "verify-session", sessionId },
        });
        clean();
        if (error || !data?.hasAccess) {
          toast.error("We could not confirm your payment yet. Please try again in a moment.");
          return;
        }
        toast.success("Payment confirmed - let's get started.");
        setEmailStepOpen(true);
      })();
    }
  }, []);


  // First message written before the co-parent has joined
  const [pendingMessage, setPendingMessage] = useState<{ id: string; body: string; recipient_email?: string | null } | null>(null);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingDraft, setPendingDraft] = useState("");
  const [savedCoparentEmail, setSavedCoparentEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [sendingPending, setSendingPending] = useState(false);

  // Load any waiting first message + a saved co-parent email
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setPendingLoading(true);
      const [{ data: pending }, { data: invite }] = await Promise.all([
        supabase
          .from("pending_first_messages")
          .select("id, body, recipient_email")
          .eq("sender_id", user.id)
          .is("delivered_at", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("invitations")
          .select("invitee_email")
          .eq("inviter_id", user.id)
          .not("invitee_email", "is", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!active) return;
      setPendingMessage(pending ?? null);
      setSavedCoparentEmail(invite?.invitee_email ?? pending?.recipient_email ?? "");
      setPendingLoading(false);
    })();
    const onInvite = (e: Event) => setSavedCoparentEmail((e as CustomEvent<string>).detail);
    window.addEventListener(INVITE_EVENT, onInvite);
    return () => {
      active = false;
      window.removeEventListener(INVITE_EVENT, onInvite);
    };
  }, [user]);

  // Deliver the waiting message once the co-parent connects
  useEffect(() => {
    if (!user || !coparentId || !pendingMessage) return;
    (async () => {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: coparentId,
        body: pendingMessage.body,
      });
      if (error) return;
      await supabase
        .from("pending_first_messages")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", pendingMessage.id);
      setPendingMessage(null);
    })();
  }, [user, coparentId, pendingMessage]);

  const sendFirstMessage = async () => {
    const text = pendingDraft.trim();
    const email = (savedCoparentEmail || pendingEmail).trim();
    if (!user || !text || sendingPending) return;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Please enter your co-parent's email address");
      return;
    }
    setSendingPending(true);
    const { data, error } = await supabase
      .from("pending_first_messages")
      .insert({ sender_id: user.id, body: text, recipient_email: email })
      .select("id, body")
      .single();
    if (error || !data) {
      setSendingPending(false);
      toast.error("Could not save your message");
      return;
    }
    try {
      await supabase.functions.invoke("send-first-message-notice", {
        body: { recipientEmail: email },
      });
    } catch {
      // message is stored either way
    }
    setPendingMessage(data);
    setSavedCoparentEmail(email);
    setPendingDraft("");
    setSendingPending(false);
    toast.success("Your message is waiting - we've let your co-parent know");
  };





  // Trigger 1: no co-parent linked 3+ days after signing up
  const showUnconnectedSuggestion = useMemo(() => {
    if (coparentId || !profile?.created_at) return false;
    return Date.now() - new Date(profile.created_at).getTime() > 3 * DAY_MS;
  }, [coparentId, profile?.created_at]);

  // Trigger 2: co-parent linked but has never replied, 7+ days after my first message
  const showNoReplySuggestion = useMemo(() => {
    if (!coparentId || !user || messages.length === 0) return false;
    const theyReplied = messages.some((m) => m.sender_id === coparentId);
    if (theyReplied) return false;
    const mine = messages.filter((m) => m.sender_id === user.id);
    if (mine.length === 0) return false;
    const first = new Date(mine[0].created_at).getTime();
    return Date.now() - first > 7 * DAY_MS;
  }, [coparentId, user, messages]);

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

  const openAttachment = async (path: string, name: string) => {
    const { data, error } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 5);
    if (error || !data?.signedUrl) {
      toast.error("Could not open that file");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    void name;
  };

  const insertMessage = async (
    body: string,
    opts?: { original?: string; usedSuggestion?: boolean },
  ) => {
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
    if (false) {
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
        toast.error("Couldn't fetch a calmer version - sending as-is");
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
      <div className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-md md:max-w-3xl lg:max-w-5xl flex-col px-6 pt-12">
        <DashboardHeader title="Financial Chat" />
        <Skeleton className="mt-4 h-full w-full rounded-2xl" />
      </div>
    );
  }

  if (questionnaireOpen) {
    return (
      <div className="mx-auto w-full max-w-md md:max-w-3xl lg:max-w-5xl overflow-y-auto px-6 pb-10 pt-12">
        <ConversationQuestionnaire
          isPayer={profile?.role !== "viewing"}
          recipientEmail={toolEmail}
          onClose={() => setQuestionnaireOpen(false)}
        />
      </div>
    );
  }

  if (activeSection === "documents") {
    return (
      <div className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-md flex-col overflow-y-auto px-6 pt-12 md:max-w-3xl lg:max-w-5xl">
        <DashboardHeader title="Financial Chat" />
        <p className="-mt-6 mb-4 text-sm text-muted-foreground">{SUBHEADING}</p>
        {sectionTabs}
        <DocumentsTab embedded />
      </div>
    );
  }

  if (!coparentId) {
    return (

      <div className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-md md:max-w-3xl lg:max-w-5xl flex-col overflow-y-auto px-6 pt-12">
        <DashboardHeader title="Financial Chat" />
        <p className="-mt-6 mb-4 text-sm text-muted-foreground">{SUBHEADING}</p>
        {sectionTabs}
        <div className="flex flex-1 flex-col gap-4 pt-2">
          <div className="rounded-2xl border border-border bg-card p-4">
            <h2 className="text-base font-semibold text-foreground">
              Start your financial conversation.
            </h2>
            {pendingLoading ? (
              <Skeleton className="mt-3 h-24 w-full rounded-xl" />
            ) : pendingMessage ? (
              <>
                <div className="mt-3 rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm leading-relaxed text-background">
                  {pendingMessage.body}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Your message is waiting. You will be able to continue the conversation once your
                  co-parent joins and responds. We have sent them an email letting them know you
                  have been in touch.
                </p>
                {savedCoparentEmail && (
                  <>
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm text-primary-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Invitation sent to <span className="font-bold break-all">{savedCoparentEmail}</span>. We will let you know when they join.
                      </p>
                    </div>
                    <ResendInviteLink email={savedCoparentEmail} className="mt-2" />
                  </>
                )}
              </>
            ) : (
              <>
                <Textarea
                  value={pendingDraft}
                  onChange={(e) => setPendingDraft(e.target.value)}
                  placeholder="Write your first message…"
                  rows={4}
                  className="mt-3 resize-none rounded-2xl border-border bg-background text-foreground"
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  Your co-parent has not yet joined Collabor8. You can write your first message now.
                  It will be delivered to them as soon as they connect. An email will be sent to
                  your co-parent letting them know you have reached out.
                </p>
                {savedCoparentEmail && (
                  <>
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm text-primary-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>
                        Invitation sent to <span className="font-bold break-all">{savedCoparentEmail}</span>. We will let you know when they join.
                      </p>
                    </div>
                    <ResendInviteLink email={savedCoparentEmail} className="mt-2" />
                  </>
                )}
                {!savedCoparentEmail && (
                  <input
                    type="email"
                    value={pendingEmail}
                    onChange={(e) => setPendingEmail(e.target.value)}
                    placeholder="Your co-parent's email address"
                    className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                  />
                )}
                <Button
                  className="mt-3 w-full"
                  onClick={sendFirstMessage}
                  disabled={!pendingDraft.trim() || sendingPending}
                >
                  {sendingPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send message"}
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <UserPlus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Not connected yet</h2>
            <p className="max-w-xs text-sm text-muted-foreground">
              Your co-parent has not yet joined Collabor8. Send them an invitation to connect.
            </p>
            <Button className="w-full max-w-xs" onClick={() => navigate("/profile")}>
              Send an invitation
            </Button>
            {showUnconnectedSuggestion && (
              <div className="w-full text-left">
                <ConversationToolSuggestionCard onOpen={openTool} />
              </div>
            )}
          </div>
        </div>

        <ConversationToolModal
          open={toolOpen}
          onOpenChange={setToolOpen}
          onStart={() => setEmailStepOpen(true)}
        />
        <ConversationEmailStep
          open={emailStepOpen}
          onOpenChange={setEmailStepOpen}
          onConfirm={(email) => {
            setToolEmail(email);
            setQuestionnaireOpen(true);
          }}
        />


      </div>
    );
  }

  if (intercept) {
    return (
      <div className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-md md:max-w-3xl lg:max-w-5xl flex-col px-6 pt-12">
        <DashboardHeader title="Financial Chat" />
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
              onClick={() =>
                insertMessage(intercept.suggestion, {
                  original: intercept.draft,
                  usedSuggestion: true,
                })
              }
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

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] w-full max-w-md md:max-w-3xl lg:max-w-5xl flex-col px-6 pt-12">
      <DashboardHeader title="Financial Chat" />

      <div className="-mt-6 mb-3 flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{SUBHEADING}</p>
        <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={handleDownload}>
          <Download className="h-4 w-4" />
          Download chat record
        </Button>
      </div>

      {sectionTabs}

      <ConversationToolModal

        open={toolOpen}
        onOpenChange={setToolOpen}
        onStart={() => setEmailStepOpen(true)}
      />
      <ConversationEmailStep
        open={emailStepOpen}
        onOpenChange={setEmailStepOpen}
        onConfirm={(email) => {
          setToolEmail(email);
          setQuestionnaireOpen(true);
        }}
      />



      <div className="mb-3 flex items-start gap-2 rounded-2xl border border-primary/30 bg-primary/10 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs text-foreground/80">
          Use Decisions for anything that needs an answer. "Rewrite calmly" is an optional, private writing aid - not legal advice.
        </p>
      </div>

      {user && coparentId && (<>
      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pb-3">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-2/3 rounded-2xl" />
            <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
            <Skeleton className="h-12 w-1/2 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm text-muted-foreground">No messages yet. Say hello.</p>
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
                      {m.attachment_path && m.attachment_name && (
                        <button
                          onClick={() => openAttachment(m.attachment_path!, m.attachment_name!)}
                          className={cn(
                            "mt-2 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs underline-offset-2 hover:underline",
                            mine ? "bg-background/15" : "bg-muted",
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{m.attachment_name}</span>
                        </button>
                      )}
                    </div>
                    <p
                      className={cn(
                        "mt-1 text-[11px] text-muted-foreground",
                        mine ? "text-right" : "text-left",
                      )}
                    >
                      {new Date(m.created_at).toLocaleString([], {
                        day: "2-digit",
                        month: "short",
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
        {showNoReplySuggestion && <ConversationToolSuggestionCard onOpen={openTool} />}
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
      <div className="-mt-2 mb-3 flex justify-end">
        <button disabled={!draft.trim()} onClick={() => setRewriteOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground disabled:opacity-40">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Rewrite calmly
        </button>
      </div>
      <RewriteComposer open={rewriteOpen} draft={draft} onOpenChange={setRewriteOpen} onUse={setDraft} />
      </>)}
    </div>
  );
};

export default ChatTab;
