import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Mail, User, Check, Lock, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type InvitedStep = "code" | "name" | "credentials" | "verify";

const SignUpInvited = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState<InvitedStep>("code");
  const [isLoading, setIsLoading] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [invitationData, setInvitationData] = useState<{ id: string; inviter_id: string } | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isCodeValid = inviteCode.length >= 6;
  const isNameValid = firstName.length > 0 && lastName.length > 0;
  const isCredentialsValid = emailRegex.test(email) && password.length >= 6;

  const handleBack = () => {
    switch (step) {
      case "code": navigate("/login"); break;
      case "name": setStep("code"); break;
      case "credentials": setStep("name"); break;
      case "verify": break;
    }
  };

  const getStepIndex = () => {
    const steps: InvitedStep[] = ["code", "name", "credentials", "verify"];
    return steps.indexOf(step);
  };

  const handleVerifyCode = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("invitations")
      .select("id, inviter_id, status")
      .eq("invite_code", inviteCode.toUpperCase())
      .single();

    setIsLoading(false);

    if (error || !data) {
      toast.error("Invalid invite code. Please check and try again.");
      return;
    }

    if ((data as any).status === "accepted") {
      toast.error("This invite code has already been used.");
      return;
    }

    setInvitationData({ id: (data as any).id, inviter_id: (data as any).inviter_id });
    setStep("name");
  };

  const handleSignUp = async () => {
    if (!invitationData) return;

    setIsLoading(true);
    const { error } = await signUp(email, password);

    if (error) {
      setIsLoading(false);
      toast.error(error.message || "Failed to create account");
      return;
    }

    // Wait a moment for the trigger to create the profile, then update it
    setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Update profile with role and name
        await supabase
          .from("profiles")
          .update({
            first_name: firstName,
            last_name: lastName,
            role: "viewing",
            coparent_id: invitationData.inviter_id,
          })
          .eq("id", user.id);

        // Update the inviter's coparent_id
        await supabase
          .from("profiles")
          .update({ coparent_id: user.id })
          .eq("id", invitationData.inviter_id);

        // Mark invitation as accepted
        await supabase
          .from("invitations")
          .update({ status: "accepted", invitee_email: email })
          .eq("id", invitationData.id);
      }

      setIsLoading(false);
      setStep("verify");
    }, 1500);
  };

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
        <Button onClick={handleVerifyCode} className="w-full" size="lg" disabled={!isCodeValid || isLoading}>
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
        <Button onClick={() => setStep("credentials")} className="w-full" size="lg" disabled={!isNameValid}>
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderCredentials = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">Create your account</h1>
      <p className="mb-8 text-muted-foreground">Enter your email and choose a password.</p>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
        </div>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="password" placeholder="Password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">Use a unique password with letters, numbers & symbols to avoid rejection.</p>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button onClick={handleSignUp} className="w-full" size="lg" disabled={!isCredentialsValid || isLoading}>
          {isLoading ? "Creating account..." : "Create Account"}
        </Button>
      </div>
    </motion.div>
  );

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
            {step === "credentials" && renderCredentials()}
            {step === "subscription" && renderSubscription()}
            {step === "verify" && renderVerify()}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default SignUpInvited;
