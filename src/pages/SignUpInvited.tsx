import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Mail, User, Check, X, Lock, KeyRound, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import appScreenshot1 from "@/assets/app-screenshot-1.png";
import appScreenshot2 from "@/assets/app-screenshot-2.png";

type InvitedStep = "code" | "name" | "method" | "credentials" | "verify";
type AuthMethod = "choice" | "apple" | "manual";

const SignUpInvited = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const [step, setStep] = useState<InvitedStep>("code");
  const [isLoading, setIsLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>("choice");

  const [inviteCode, setInviteCode] = useState("");
  const [invitationData, setInvitationData] = useState<{ id: string; inviter_id: string; invitee_email: string | null } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const passwordChecks = (pw: string) => ({
    length: pw.length >= 8,
    mixed: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    number: /\d/.test(pw),
  });
  const pwc = passwordChecks(password);
  const isPasswordValid = pwc.length && pwc.mixed && pwc.number;
  const isCodeValid = inviteCode.length >= 6;
  const isNameValid = firstName.length > 0 && lastName.length > 0;
  const isCredentialsValid = emailRegex.test(email) && isPasswordValid;

  const handleBack = () => {
    switch (step) {
      case "code": navigate("/login"); break;
      case "name": setStep("code"); break;
      case "method": setStep("name"); break;
      case "credentials": setStep("method"); break;
      case "verify": break;
    }
  };

  const getStepIndex = () => {
    const steps: InvitedStep[] = ["code", "name", "method", "credentials", "verify"];
    return steps.indexOf(step);
  };

  const handleVerifyCode = async (codeOverride?: string) => {
    const code = (codeOverride ?? inviteCode).toUpperCase();
    if (code.length < 6) return;
    setIsLoading(true);
    const { data, error } = await supabase.rpc("get_invitation_by_code", {
      _invite_code: code,
    });

    setIsLoading(false);

    if (error || !data || data.length === 0) {
      toast.error("Invalid invite code. Please check and try again.");
      return;
    }

    const invite = data[0];
    if (invite.status === "accepted") {
      toast.error("This invite code has already been used.");
      return;
    }

    setInvitationData({
      id: invite.id,
      inviter_id: invite.inviter_id,
      invitee_email: invite.invitee_email ?? null,
    });
    if (invite.invitee_email) {
      setEmail(invite.invitee_email);
    }
    setStep("name");
  };

  // Auto-fill invite code from ?code= in URL and auto-verify
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get("code");
    if (codeFromUrl && codeFromUrl.length >= 6) {
      const upper = codeFromUrl.toUpperCase().slice(0, 6);
      setInviteCode(upper);
      handleVerifyCode(upper);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishSignUp = async (signedInUser: any) => {
    if (!invitationData || !signedInUser) return;

    setIsLoading(true);

    // Update own profile with role and name (allowed by RLS)
    await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        role: "viewing",
      })
      .eq("id", signedInUser.id);

    // Link both sides atomically via SECURITY DEFINER RPC
    const { error: linkError } = await supabase.rpc("accept_coparent_invitation", {
      _invite_code: inviteCode.toUpperCase(),
    });

    if (linkError) {
      console.error("accept_coparent_invitation failed", linkError);
      toast.error("Could not link co-parent accounts. Please contact support.");
      setIsLoading(false);
      return;
    }

    setEmail(signedInUser.email ?? "");
    setIsLoading(false);

    localStorage.removeItem("invited_pending_apple");
    setStep("verify");
  };

  const handleManualSignUp = async () => {
    if (!invitationData) return;

    setIsLoading(true);
    const { error } = await signUp(email, password);

    if (error) {
      setIsLoading(false);
      toast.error(error.message || "Failed to create account");
      return;
    }

    // Wait a moment for the trigger to create the profile, then finish
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await finishSignUp(user);
      } else {
        setIsLoading(false);
        toast.error("Session expired. Please try again.");
      }
    }, 1500);
  };

  const handleAppleSignUp = async () => {
    if (!invitationData) return;
    setAppleLoading(true);

    localStorage.setItem("invited_pending_apple", "true");

    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/signup/invited`,
    });

    setAppleLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Apple sign up failed. Please try again.");
      localStorage.removeItem("invited_pending_apple");
      return;
    }

    if (result.redirected) {
      return;
    }

    // Popup flow completed; session will be set via onAuthStateChange
  };

  // Continue Apple sign-up flow after OAuth redirect
  useEffect(() => {
    const pendingApple = localStorage.getItem("invited_pending_apple") === "true";
    if (user && pendingApple && invitationData) {
      finishSignUp(user);
    }
  }, [user, invitationData]);

  const renderProgressBar = () => (
    <div className="flex items-center gap-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= getStepIndex() ? "bg-foreground" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );

  const renderCode = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">Enter your invite code</h1>
      <p className="mb-8 text-muted-foreground">
        Your co-parent should have shared a 6-character code with you.
      </p>

      <div className="relative">
        <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Enter invite code"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          maxLength={6}
          className="h-14 rounded-2xl border-border bg-background pl-12 text-center text-lg font-mono tracking-widest text-foreground placeholder:text-muted-foreground focus:border-foreground"
        />
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button onClick={() => handleVerifyCode()} className="w-full" size="lg" disabled={!isCodeValid || isLoading}>
          {isLoading ? "Verifying..." : "Continue"}
        </Button>
      </div>
    </motion.div>
  );

  const renderName = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">What's your name?</h1>
      <p className="mb-8 text-muted-foreground">Enter your full name as it appears on official documents.</p>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
        </div>
        <div className="relative">
          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="text" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
        </div>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button onClick={() => setStep("method")} className="w-full" size="lg" disabled={!isNameValid}>
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderMethod = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <div className="mb-8 mt-4 flex justify-center gap-4">
        <div className="h-40 w-28 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
          <img src={appScreenshot1} alt="App dashboard preview" className="h-full w-full object-cover" />
        </div>
        <div className="h-40 w-28 overflow-hidden rounded-2xl border border-border bg-card shadow-elevated">
          <img src={appScreenshot2} alt="Payment setup preview" className="h-full w-full object-cover" />
        </div>
      </div>

      <h1 className="mb-2 text-3xl font-bold text-foreground">Create your account</h1>
      <p className="mb-8 text-muted-foreground">Choose how you would like to sign up.</p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => setAuthMethod("apple")}
          className={`w-full gap-3 ${authMethod === "apple" ? "bg-foreground text-background" : "bg-card text-foreground hover:bg-muted"}`}
          size="lg"
        >
          <Apple className="h-5 w-5" />
          Sign up with Apple
        </Button>

        <Button
          onClick={() => setAuthMethod("manual")}
          className={`w-full ${authMethod === "manual" ? "bg-clay text-clay-foreground" : "bg-card text-foreground hover:bg-muted"}`}
          size="lg"
        >
          Sign up with email
        </Button>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={() => {
            if (authMethod === "apple") {
              handleAppleSignUp();
            } else {
              setStep("credentials");
            }
          }}
          className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
          size="lg"
          disabled={authMethod === "choice" || appleLoading}
        >
          {appleLoading ? "Redirecting..." : authMethod === "apple" ? "Continue with Apple" : "Continue"}
        </Button>
      </div>
    </motion.div>
  );

  const renderCredentials = () => {
    const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
      <div className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${ok ? "bg-clay/10 text-clay" : "bg-destructive/10 text-destructive"}`}>
        {ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
        {label}
      </div>
    );
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="flex flex-1 flex-col"
      >
        <h1 className="mb-2 text-3xl font-bold text-foreground">Create your account</h1>
        <p className="mb-6 text-muted-foreground">Your password must meet these three rules before you continue.</p>

        <div className="flex flex-col gap-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`h-14 rounded-2xl border-2 bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground ${password && !isPasswordValid ? "border-destructive" : "border-border"}`}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Rule ok={pwc.length} label="At least 8 characters" />
            <Rule ok={pwc.mixed} label="Upper and lowercase letters" />
            <Rule ok={pwc.number} label="At least one number" />
          </div>
        </div>

        <div className="flex-1" />

        <div className="pb-8 pt-6">
          <Button onClick={handleManualSignUp} className="w-full" size="lg" disabled={!isCredentialsValid || isLoading}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderVerify = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
        <Check className="h-10 w-10 text-primary" />
      </div>

      <h1 className="mb-2 text-3xl font-bold text-foreground">Account created!</h1>
      <p className="mb-2 text-muted-foreground">Your account has been linked to your co-parent.</p>
      <p className="mb-8 font-semibold text-foreground">{email}</p>
      <p className="text-sm text-muted-foreground">
        You can view the maintenance arrangement set up by your co-parent.
      </p>

      <div className="flex-1" />

      <div className="w-full pb-8 pt-6">
        <Button onClick={() => navigate("/post-signup")} className="mb-3 w-full" size="lg">
          Continue Setup
        </Button>
        <Button onClick={() => navigate("/dashboard")} variant="ghost" className="w-full text-muted-foreground" size="lg">
          Go to Dashboard
        </Button>
      </div>
    </motion.div>
  );

  return (
    <>
      <Helmet>
        <title>Sign Up with Invite - Collabor8</title>
        <meta name="description" content="Join Collabor8 with your invite code. Create your account to start managing child maintenance payments with your co-parent." />
        <link rel="canonical" href="https://collaborate8.com/signup/invited" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <div className="px-6 pt-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            {step !== "verify" && (
              <button onClick={handleBack} className="mb-4 flex h-10 w-10 items-center justify-center">
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
            )}
            {renderProgressBar()}
          </motion.div>
        </div>

        <div className="flex flex-1 flex-col px-6">
          <AnimatePresence mode="wait">
            {step === "code" && renderCode()}
            {step === "name" && renderName()}
            {step === "method" && renderMethod()}
            {step === "credentials" && renderCredentials()}
            {step === "verify" && renderVerify()}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default SignUpInvited;
