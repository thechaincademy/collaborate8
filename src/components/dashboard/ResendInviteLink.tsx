import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

export const INVITE_EVENT = "c8-invite-updated";

interface Props {
  email: string;
  onResent?: (email: string) => void;
  className?: string;
}

/** "Wrong email address? Resend invitation" link + modal. */
const ResendInviteLink = ({ email, onResent, className = "" }: Props) => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(email);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const next = value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      toast.error("Please enter a valid email address");
      return;
    }
    if (!profile?.invite_code) {
      toast.error("Could not find your invite code");
      return;
    }
    setBusy(true);
    const { error } = await supabase.functions.invoke("send-invite-email", {
      body: { recipientEmail: next, inviteCode: profile.invite_code, senderName: profile.first_name ?? undefined },
    });
    if (user) {
      await supabase
        .from("pending_first_messages")
        .update({ recipient_email: next })
        .eq("sender_id", user.id)
        .is("delivered_at", null);
    }
    setBusy(false);
    if (error) {
      toast.error("Could not resend the invitation");
      return;
    }
    toast.success("Invitation resent");
    window.dispatchEvent(new CustomEvent(INVITE_EVENT, { detail: next }));
    onResent?.(next);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setValue(email);
          setOpen(true);
        }}
        className={`text-xs font-medium text-primary underline-offset-4 hover:underline ${className}`}
      >
        Wrong email address? Resend invitation
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Resend invitation</DialogTitle>
          </DialogHeader>
          <Input type="email" value={value} onChange={(e) => setValue(e.target.value)} />
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Resend invitation"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ResendInviteLink;
