import { useEffect, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { rememberLastSignupEmail } from "@/lib/lastSignupEmail";

export const CONFIRM_REDIRECT = "https://collaborate8.com/dashboard";

const CheckEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const email = (location.state as { email?: string } | null)?.email ?? params.get("email") ?? "";
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (email) rememberLastSignupEmail(email);
  }, [email]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    if (!email) return toast.error("Please sign up again with your email address.");
    setSending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: CONFIRM_REDIRECT } });
    setSending(false);
    if (error) return toast.error("We couldn't resend the email. Please try again in a minute.");
    toast.success("Confirmation email sent");
    setCooldown(60);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-background px-6 text-center">
      <Helmet><title>Check your email - Collabor8</title><meta name="robots" content="noindex" /></Helmet>
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
        <Mail className="h-8 w-8 text-primary" />
      </div>
      <h1 className="mb-3 text-3xl font-bold text-foreground">Check your email</h1>
      <p className="mb-3 text-foreground/90">
        We've sent a confirmation link to <span className="font-semibold text-foreground">{email || "your email address"}</span>. Tap the link to finish setting up your Collabor8 account.
      </p>
      <p className="mb-8 text-sm text-muted-foreground">Can't see it? Check your spam or junk folder.</p>
      <Button onClick={resend} disabled={sending || cooldown > 0 || !email} size="lg" className="mb-3 w-full">
        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : cooldown > 0 ? `Resend email in ${cooldown}s` : "Resend email"}
      </Button>
      <Button onClick={() => navigate("/signup")} variant="outline" size="lg" className="mb-3 w-full">Use a different email</Button>
      <button onClick={() => navigate("/login")} className="text-sm font-semibold text-foreground underline">Back to log in</button>
    </div>
  );
};

export default CheckEmail;
