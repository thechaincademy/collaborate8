import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Check, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", test: (p: string) => /[a-z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
];

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);

  useEffect(() => {
    let active = true;

    // The recovery link may still be exchanging its token when this mounts,
    // so listen for the session as well as checking for an existing one.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        setHasRecoverySession(true);
        setChecking(false);
      }
    });

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      if (data.session) setHasRecoverySession(true);
      setChecking(false);
    })();

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const allRulesPass = rules.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;
  const canSubmit = allRulesPass && matches && !isLoading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      toast.error(error.message || "Could not update your password");
      return;
    }
    toast.success("Password updated");
    navigate("/dashboard");
  };

  return (
    <>
      <Helmet>
        <title>Set a new password - Collabor8</title>
        <meta name="description" content="Choose a new password for your Collabor8 account." />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6">
        <div className="pt-12">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-clay-soft">
            <ShieldCheck className="h-8 w-8 text-clay" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Set a new password</h1>
          <p className="mb-8 text-muted-foreground">
            Choose a new password for your account.
          </p>
        </div>

        {checking ? (
          <p className="text-muted-foreground">Checking your reset link...</p>
        ) : !hasRecoverySession ? (
          <div className="flex flex-1 flex-col">
            <p className="text-foreground">
              This reset link is no longer valid. It may have expired or already been used.
            </p>
            <div className="flex-1" />
            <div className="pb-8">
              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
                size="lg"
              >
                Request a new link
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
            <div className="relative mb-4">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
              />
            </div>

            <div className="relative mb-6">
              <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
              />
            </div>

            <ul className="space-y-2">
              {rules.map((rule) => {
                const ok = rule.test(password);
                return (
                  <li key={rule.label} className="flex items-center gap-2 text-sm">
                    {ok ? (
                      <Check className="h-4 w-4 text-clay" />
                    ) : (
                      <X className="h-4 w-4 text-destructive" />
                    )}
                    <span className={ok ? "text-foreground" : "text-muted-foreground"}>
                      {rule.label}
                    </span>
                  </li>
                );
              })}
              <li className="flex items-center gap-2 text-sm">
                {matches ? (
                  <Check className="h-4 w-4 text-clay" />
                ) : (
                  <X className="h-4 w-4 text-destructive" />
                )}
                <span className={matches ? "text-foreground" : "text-muted-foreground"}>
                  Both passwords match
                </span>
              </li>
            </ul>

            <div className="flex-1" />

            <div className="pb-8 pt-6">
              <Button
                type="submit"
                className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
                size="lg"
                disabled={!canSubmit}
              >
                {isLoading ? "Updating..." : "Update password"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </>
  );
};

export default ResetPassword;
