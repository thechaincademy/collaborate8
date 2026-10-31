import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Mail, Lock } from "lucide-react";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { consumeConfirmLinkError } from "@/lib/confirmLinkError";
import { CONFIRM_REDIRECT } from "@/pages/CheckEmail";
import appScreenshot1 from "@/assets/app-screenshot-1-hd.png";
import appScreenshot2 from "@/assets/app-screenshot-2-hd.png";
import appScreenshot3 from "@/assets/app-screenshot-3-hd.png";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signIn, user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [linkError] = useState(() => consumeConfirmLinkError());
  const [resendEmail, setResendEmail] = useState(() => linkError?.email || searchParams.get("email") || "");
  const [resendSending, setResendSending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const resendConfirmation = async () => {
    const target = resendEmail.trim();
    if (!target) return toast.error("Please enter your email address.");
    setResendSending(true);
    setResendMsg("");
    const { error } = await supabase.auth.resend({ type: "signup", email: target, options: { emailRedirectTo: CONFIRM_REDIRECT } });
    setResendSending(false);
    if (error) {
      const isRate = /rate limit/i.test(error.message ?? "") || (error as { status?: number }).status === 429;
      setResendMsg(isRate ? "Too many emails have been sent just now. Please wait a few minutes and try again." : "We couldn't resend the email. Please try again in a minute.");
      return;
    }
    setResendMsg("We've sent a new confirmation link. Please check your inbox.");
    setResendCooldown(60);
  };

  // Same-origin relative path only, so an external "next" can never be used.
  const rawNext = searchParams.get("next") ?? "";
  const nextPath = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  useEffect(() => {
    if (user && !loading) {
      navigate(nextPath);
    }
  }, [user, loading, navigate, nextPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email and password");
      return;
    }
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      if (/email not confirmed/i.test(error.message ?? "")) {
        toast.error("Please confirm your email first. We sent you a link when you signed up.", {
          action: { label: "Resend link", onClick: () => navigate(`/check-email?email=${encodeURIComponent(email)}`, { state: { email } }) },
          duration: 10000,
        });
      } else {
        toast.error(error.message || "Failed to log in");
      }
    } else {
      void track("login", { method: "password" });
      navigate(nextPath);
    }
  };


  return (
    <>
      <Helmet>
        <title>Log In - Collabor8</title>
        <meta name="description" content="Log in to Collabor8 to manage child maintenance payments, track expenses, and stay on top of co-parenting finances." />
        <link rel="canonical" href="https://collaborate8.com/login" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md md:max-w-xl flex-col bg-background px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-4"
        >
          <button onClick={() => navigate(-1)} aria-label="Go back" className="mb-4 flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </motion.div>

        <div className="flex flex-1 flex-col">
          {/* Picture collage */}
          <div className="relative mb-6 mt-2 h-56 w-full">
            <div className="absolute left-4 top-0 h-48 w-32 rotate-[-6deg] overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <img src={appScreenshot1} alt="App dashboard preview" className="h-full w-full object-cover" />
            </div>
            <div className="absolute left-1/2 top-4 h-52 w-36 -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <img src={appScreenshot2} alt="Payment setup preview" className="h-full w-full object-cover" />
            </div>
            <div className="absolute right-4 top-8 h-44 w-32 rotate-[6deg] overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
              <img src={appScreenshot3} alt="Expense tracking preview" className="h-full w-full object-cover" />
            </div>
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold text-foreground">Log in to Collabor8</h1>
          <p className="mb-8 text-center text-muted-foreground">
            Welcome back. Sign in with your email and password to continue.
          </p>

          {linkError && (
            <div className="mb-6 flex flex-col gap-3">
              <p className="text-foreground">
                This confirmation link has expired or has already been used. Log in to get a new one, or request a new link below.
              </p>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  aria-label="Email for new confirmation link"
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
                />
              </div>
              <Button type="button" variant="outline" size="lg" className="w-full" onClick={resendConfirmation} disabled={resendSending || resendCooldown > 0}>
                {resendSending ? "Sending..." : resendCooldown > 0 ? `Send a new link in ${resendCooldown}s` : "Send a new link"}
              </Button>
              {resendMsg && <p role="status" className="text-sm text-foreground">{resendMsg}</p>}
            </div>
          )}

          {/* Manual form */}
          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            onSubmit={handleLogin}
            className="flex flex-1 flex-col"
          >
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay"
                />
              </div>

              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="self-start text-sm font-semibold text-foreground"
              >
                Forgot password?
              </button>
            </div>

            <div className="flex-1" />

            <div className="pb-8 pt-6">
              <Button
                type="submit"
                className="mb-4 w-full bg-clay text-clay-foreground hover:bg-clay/90"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? "Logging in..." : "Log In"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                By proceeding, you accept our{" "}
                <Link to="/privacy" className="font-semibold text-foreground underline">Privacy Policy</Link>
                {" "}and{" "}
                <Link to="/terms" className="font-semibold text-foreground underline">Terms of Service</Link>.
              </p>

              <button
                type="button"
                onClick={() => navigate("/signup/invited")}
                className="mt-4 w-full text-center text-sm font-semibold text-foreground"
              >
                Have an invite code? Sign up here
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </>
  );
};

export default Login;
