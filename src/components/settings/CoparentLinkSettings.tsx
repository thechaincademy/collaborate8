import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Clock, Copy, CreditCard, Landmark, ChevronRight, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import ResendInviteLink, { INVITE_EVENT } from "@/components/dashboard/ResendInviteLink";

const CoparentLinkSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [inviteEmail, setInviteEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState("");
  const [sending, setSending] = useState(false);
  const isLinked = !!profile?.coparent_id;
  const code = profile?.invite_code ?? "";

  useEffect(() => {
    if (!user) return;
    supabase.from("invitations").select("invitee_email").eq("inviter_id", user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setInviteEmail(data?.invitee_email ?? null));
    const on = (e: Event) => setInviteEmail((e as CustomEvent<string>).detail);
    window.addEventListener(INVITE_EVENT, on);
    return () => window.removeEventListener(INVITE_EVENT, on);
  }, [user]);

  const send = async () => {
    const next = emailInput.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) || !code) return toast.error("Please enter a valid email address");
    setSending(true);
    const { error } = await supabase.functions.invoke("send-invite-email", {
      body: { recipientEmail: next, inviteCode: code, senderName: profile?.first_name ?? undefined },
    });
    setSending(false);
    if (error) return toast.error("Could not send the invite email");
    toast.success("Invitation sent");
    setInviteEmail(next);
    setEmailInput("");
    window.dispatchEvent(new CustomEvent(INVITE_EVENT, { detail: next }));
  };

  const copy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const row = "flex w-full items-center justify-between border-b border-border p-4 text-left hover:bg-muted/50";

  return (
    <>
      <div className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${isLinked ? "bg-status-ok/15 text-status-ok" : "bg-primary/15 text-primary"}`}>
            {isLinked ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="font-medium text-foreground">{isLinked ? "Co-parent linked" : "Waiting for co-parent to link"}</p>
            {!isLinked && inviteEmail && <p className="truncate text-xs text-muted-foreground">Invitation sent to {inviteEmail}</p>}
          </div>
        </div>
        {!isLinked && (
          <div className="mt-4 space-y-3">
            {inviteEmail ? (
              <ResendInviteLink email={inviteEmail} onResent={setInviteEmail} />
            ) : (
              <div className="flex gap-2">
                <Input type="email" inputMode="email" placeholder="co-parent@email.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
                <Button onClick={send} disabled={sending || !emailInput.trim()} className="gap-2">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send
                </Button>
              </div>
            )}
            <button onClick={copy} disabled={!code} className="flex w-full items-center justify-between rounded-xl border border-primary/40 bg-primary/10 px-4 py-3">
              <span className="text-left">
                <span className="block text-[11px] uppercase tracking-wider text-muted-foreground">Your unique code</span>
                <span className="text-lg font-bold tracking-widest text-foreground">{code || "------"}</span>
              </span>
              <Copy className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        )}
      </div>
      <button onClick={() => navigate("/profile")} className={row}>
        <span className="flex items-center gap-3"><CreditCard className="h-5 w-5 text-muted-foreground" /><span className="text-foreground">Update payment option</span></span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
      <button onClick={() => navigate("/coparent-bank-account")} className={row.replace("border-b border-border ", "")}>
        <span className="flex items-center gap-3"><Landmark className="h-5 w-5 text-muted-foreground" /><span className="text-foreground">Update co-parent bank account</span></span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </>
  );
};

export default CoparentLinkSettings;
