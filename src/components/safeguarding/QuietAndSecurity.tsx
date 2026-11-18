import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { quietModeCopy, securityCheckCopy } from "@/content/safeguarding";
import { setQuietMode } from "@/lib/safeguarding/api";
import { passwordIsStrong } from "@/lib/safeguarding/logic";
import { SafeguardingSurface } from "@/components/safeguarding/SafeguardingSurface";

export function QuietAndSecurity({
  quiet,
  preview = false,
  securityOnly = false,
  onQuietChange,
}: {
  quiet: boolean;
  preview?: boolean;
  securityOnly?: boolean;
  onQuietChange?: (value: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const toggleQuiet = async (next: boolean) => {
    if (preview) {
      onQuietChange?.(next);
      return;
    }
    setBusy(true);
    try {
      const result = await setQuietMode(next);
      onQuietChange?.(result.quietMode);
      toast.success(result.quietMode ? quietModeCopy.savedOn : quietModeCopy.savedOff);
    } catch {
      toast.error(quietModeCopy.body);
    } finally {
      setBusy(false);
    }
  };

  const signOutOthers = async () => {
    if (preview) {
      setAskPassword(true);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signOut({ scope: "others" });
    setBusy(false);
    if (error) {
      toast.error(securityCheckCopy.failed);
      return;
    }
    setAskPassword(true);
    toast.success(securityCheckCopy.signedOut);
  };

  const updatePassword = async () => {
    if (password !== confirm) {
      toast.error(securityCheckCopy.mismatch);
      return;
    }
    if (!passwordIsStrong(password)) {
      toast.error(securityCheckCopy.weak);
      return;
    }
    if (preview) {
      toast.success(securityCheckCopy.updated);
      setAskPassword(false);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(securityCheckCopy.failed);
      return;
    }
    setPassword("");
    setConfirm("");
    setAskPassword(false);
    toast.success(securityCheckCopy.updated);
  };

  return (
    <SafeguardingSurface className="space-y-4 p-4">
      {!securityOnly && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-medium text-foreground">{quietModeCopy.title}</p>
            <p className="mt-1 text-sm text-foreground">{quietModeCopy.body}</p>
          </div>
          <Switch className="mt-1" aria-label={quiet ? quietModeCopy.off : quietModeCopy.on} checked={quiet} disabled={busy} onCheckedChange={(value) => void toggleQuiet(value)} />
        </div>
      )}
      <div className={securityOnly ? "" : "border-t border-border pt-4"}>
        <p className="font-medium text-foreground">{securityCheckCopy.title}</p>
        <p className="mt-1 text-sm text-foreground">{securityCheckCopy.body}</p>
        <Button type="button" variant="outline" className="mt-3 min-h-11 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" onClick={() => void signOutOthers()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : securityCheckCopy.signOutOthers}
        </Button>
        {askPassword && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-foreground">{securityCheckCopy.signedOut}</p>
            <label className="block text-sm text-foreground">
              {securityCheckCopy.passwordLabel}
              <Input className="mt-1 min-h-11" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            <label className="block text-sm text-foreground">
              {securityCheckCopy.confirmLabel}
              <Input className="mt-1 min-h-11" type="password" autoComplete="new-password" value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </label>
            <Button type="button" className="min-h-11" onClick={() => void updatePassword()} disabled={busy}>{securityCheckCopy.update}</Button>
          </div>
        )}
      </div>
    </SafeguardingSurface>
  );
}
