import { useState } from "react";
import { User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { savePayerProfile } from "@/lib/profileCompletion";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  userId: string;
  onDone: () => void;
}

/** Short step for accounts that reached the app without a saved name. */
const CompleteProfile = ({ userId, onDone }: Props) => {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [coparentEmail, setCoparentEmail] = useState("");
  const [needsInvite, setNeedsInvite] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  if (needsInvite === null) {
    supabase
      .from("profiles")
      .select("invite_code, coparent_id")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setNeedsInvite(!data?.invite_code && !data?.coparent_id));
  }

  const nameOk = firstName.trim().length > 0 && lastName.trim().length > 0;
  const emailOk = coparentEmail.length === 0 || emailRegex.test(coparentEmail);

  const save = async () => {
    setSaving(true);
    const first = firstName.trim();
    const last = lastName.trim();
    let error: unknown = null;
    if (needsInvite) {
      ({ error } = await savePayerProfile(userId, first, last, coparentEmail.trim() || null));
    } else {
      ({ error } = await supabase.from("profiles").update({ first_name: first, last_name: last }).eq("id", userId));
      window.dispatchEvent(new Event("c8-profile-refresh"));
    }
    setSaving(false);
    if (error) {
      console.error("complete profile failed", error);
      toast.error("Something went wrong saving your details. Please try again.");
      return;
    }
    onDone();
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6 pt-10">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Complete your profile</h1>
      <p className="mb-8 text-muted-foreground">Enter your full name as it appears on official documents.</p>
      <div className="flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="First name" aria-label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay" />
        </div>
        <div className="relative">
          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Last name" aria-label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay" />
        </div>
        {needsInvite && (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              Invite your co-parent (optional). They will receive a unique invite code so they can create their account.
            </p>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input type="email" placeholder="Co-parent's email (optional)" aria-label="Co-parent's email address" value={coparentEmail} onChange={(e) => setCoparentEmail(e.target.value)}
                className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay" />
            </div>
            {!emailOk && <p className="text-sm text-destructive">Please enter a valid email address.</p>}
          </>
        )}
      </div>
      <div className="flex-1" />
      <div className="pb-8 pt-6">
        <Button onClick={save} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!nameOk || !emailOk || saving || needsInvite === null}>
          {saving ? "Saving..." : "Continue"}
        </Button>
      </div>
    </div>
  );
};

export default CompleteProfile;
