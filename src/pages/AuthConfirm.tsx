import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { KeyRound, MailCheck, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  afterVerify,
  clearConfirmParams,
  confirmCopy,
  isExpiredOrUsed,
  otpType,
  readConfirmParams,
  type ConfirmParams,
} from "@/lib/authConfirm";

type Status = "ready" | "working" | "expired" | "failed" | "email_change_pending";

const session = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

/**
 * Every auth email link opens this page. Opening it never uses the token, so an email link
 * scanner cannot spend it: supabase.auth.verifyOtp only runs when the parent presses the button.
 */
const AuthConfirm = () => {
  const navigate = useNavigate();
  // Read once on first render. index.html has usually moved the details out of the address bar
  // already, so the token never reaches analytics or a shared screenshot.
  const [params] = useState<ConfirmParams | null>(() => readConfirmParams(window.location.search, session()));
  const [status, setStatus] = useState<Status>("ready");

  const handleConfirm = async () => {
    if (!params || status === "working") return;
    setStatus("working");
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: params.tokenHash, type: otpType(params.type) });
    if (error) {
      if (isExpiredOrUsed(error)) {
        clearConfirmParams(session());
        setStatus("expired");
      } else {
        setStatus("failed");
      }
      return;
    }
    clearConfirmParams(session());
    const next = afterVerify(params, Boolean(data?.session));
    if (next.kind === "email_change_pending") {
      setStatus("email_change_pending");
      return;
    }
    navigate(next.to, { replace: true });
  };

  const isRecovery = params?.type === "recovery";
  const copy = params ? confirmCopy(params.type) : null;
  const Icon = isRecovery ? KeyRound : params?.type === "magiclink" || params?.type === "email" ? ShieldCheck : MailCheck;

  let title = copy?.title ?? "Open your link";
  let message: string;
  if (!params) {
    message = "This link is not complete. Please open it again from your email, or request a new one.";
  } else if (status === "expired") {
    message = isRecovery
      ? "This reset link has expired or has already been used. Please request a new one."
      : "This link has expired or has already been used. Please request a new one.";
  } else if (status === "email_change_pending") {
    title = "One more step";
    message = "This email address is confirmed. Now open the link we sent to your other email address to finish the change.";
  } else {
    message = copy!.body;
  }

  const showConfirm = params && (status === "ready" || status === "working" || status === "failed");

  return (
    <>
      <Helmet>
        <title>{`${title} - Collabor8`}</title>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="referrer" content="no-referrer" />
      </Helmet>
      <main id="main" tabIndex={-1} className="mx-auto flex min-h-screen max-w-md md:max-w-xl flex-col bg-background px-6 focus:outline-none">
        <div className="pt-12">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-clay-soft">
            <Icon className="h-8 w-8 text-clay" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">{title}</h1>
          <p className="mb-4 text-muted-foreground" data-testid="auth-confirm-message">{message}</p>
          {status === "failed" && (
            <p role="alert" className="mb-4 text-sm text-destructive">
              Something went wrong. Please check your connection and try again.
            </p>
          )}
          {showConfirm && (
            <p className="text-sm text-muted-foreground">
              We ask you to press the button so that email security checks cannot use your link before you do.
            </p>
          )}
        </div>

        {/* Right under the text, not pinned to the bottom, so the cookie banner never covers it on phones. */}
        <div className="space-y-3 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-8">
          {showConfirm ? (
            <Button
              onClick={handleConfirm}
              disabled={status === "working"}
              className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
              size="lg"
            >
              {status === "working" ? copy!.busy : copy!.button}
            </Button>
          ) : status === "email_change_pending" ? (
            <Button onClick={() => navigate("/dashboard")} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg">
              Go to Collabor8
            </Button>
          ) : (
            <>
              <Button
                onClick={() => navigate(!params || isRecovery ? "/forgot-password" : "/login")}
                className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
                size="lg"
              >
                {!params || isRecovery ? "Request a new link" : "Go to log in"}
              </Button>
              {params && !isRecovery && (
                <Button variant="ghost" onClick={() => navigate("/forgot-password")} className="w-full" size="lg">
                  Forgot your password?
                </Button>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default AuthConfirm;
