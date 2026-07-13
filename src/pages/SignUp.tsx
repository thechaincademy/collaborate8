import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Mail, User, Check, Lock, ArrowRight, ArrowDownLeft, Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";
import appScreenshot1 from "@/assets/app-screenshot-1.png";
import appScreenshot2 from "@/assets/app-screenshot-2.png";
import appScreenshot3 from "@/assets/app-screenshot-3.png";

type Role = "managing" | "viewing";
type SignUpStep = "welcome" | "role" | "name" | "email" | "password" | "coparent" | "verify";
type AuthMethod = "choice" | "apple" | "manual";

const STEPS: SignUpStep[] = ["welcome", "role", "name", "email", "password", "coparent", "verify"];

const generateInviteCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const passwordChecks = (pw: string) => ({
  length: pw.length >= 8,
  mixed: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
  number: /\d/.test(pw),
});

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp, user } = useAuth();
  const [step, setStep] = useState<SignUpStep>("welcome");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("choice");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [appleLoading, setAppleLoading] = useState(false);

  // Form state
  const [role, setRole] = useState<Role | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [coparentEmail, setCoparentEmail] = useState("");
  const [accountCreated, setAccountCreated] = useState(false);

  // Continue Apple sign-up flow after OAuth redirect
  useEffect(() => {
    const pendingApple = localStorage.getItem("signup_pending_apple") === "true";
    const savedMethod = localStorage.getItem("signup_method") as AuthMethod | null;
    const savedRole = localStorage.getItem("signup_role") as Role | null;

    if (user && pendingApple && savedMethod === "apple" && (savedRole === "managing" || savedRole === "viewing")) {
      setAuthMethod("apple");
      setRole(savedRole);
      setAccountCreated(true);
      setEmail(user.email ?? "");
      setStep("name");
    }
  }, [user]);

  const isNameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const isEmailFormatValid = emailRegex.test(email);
  const pwc = passwordChecks(password);
  const isPasswordValid = pwc.length && pwc.mixed && pwc.number;
  const isCoparentValid = coparentEmail.length === 0 || emailRegex.test(coparentEmail);

  const handleBack = () => {
    const idx = STEPS.indexOf(step);
    if (idx <= 0) {
      navigate("/");
      return;
    }
    setStep(STEPS[idx - 1]);
  };

  const getStepIndex = () => STEPS.indexOf(step);

  const handleAppleSignUp = async () => {
    if (!role) return;
    setAppleLoading(true);

    // Persist signup intent so we can continue after OAuth redirect
    localStorage.setItem("signup_method", "apple");
    localStorage.setItem("signup_role", role);
    localStorage.setItem("signup_pending_apple", "true");

    const result = await lovable.auth.signInWithOAuth("apple", {
      redirect_uri: `${window.location.origin}/signup`,
    });

    setAppleLoading(false);

    if (result.error) {
      toast.error(result.error.message || "Apple sign up failed. Please try again.");
      localStorage.removeItem("signup_pending_apple");
      return;
    }

    if (result.redirected) {
      // Browser is redirecting to Apple; let it happen
      return;
    }

    // Popup flow completed; session will be set via onAuthStateChange and the
    // useEffect above will continue the flow.
  };

  // Create the account at the password step so we surface "email exists" inline.
  const handlePasswordContinue = async () => {
    if (accountCreated) {
      setStep("coparent");
      return;
    }
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);
    if (error) {
      const msg = error.message?.toLowerCase() ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        setEmailError("An account already exists for this email.");
        setStep("email");
      } else if (msg.includes("password")) {
        toast.error(error.message);
      } else {
        toast.error(error.message || "Could not create account");
      }
      return;
    }
    setAccountCreated(true);
    setStep("coparent");
  };

  const handleEmailContinue = () => {
    setEmailError(null);
    setStep("password");
  };

  const finishSignUp = async () => {
    setIsLoading(true);
    // Profile may take a moment to be created by the trigger
    await new Promise((r) => setTimeout(r, 800));
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setIsLoading(false);
      toast.error("Session expired. Please log in.");
      navigate("/login");
      return;
    }
    const code = generateInviteCode();
    await supabase
      .from("profiles")
      .update({
        first_name: firstName,
        last_name: lastName,
        role: role ?? "managing",
        invite_code: code,
      })
      .eq("id", user.id);

    await supabase.from("invitations").insert({
      inviter_id: user.id,
      invite_code: code,
      invitee_email: coparentEmail || null,
    });

    if (coparentEmail) {
      await supabase.functions.invoke("send-invite-email", {
        body: {
          recipientEmail: coparentEmail,
          inviteCode: code,
          senderName: `${firstName} ${lastName}`,
        },
      });
    }

    setGeneratedCode(code);
    setIsLoading(false);
    setStep("verify");
  };

  const renderProgressBar = () => {
    const current = getStepIndex();
    return (
      <div className="flex items-center gap-2">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < current ? "bg-foreground" : i === current ? "bg-clay" : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  // ── Welcome: choose sign-up method ──
  const renderWelcome = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      {/* Picture collage */}
      <div className="relative mb-8 mt-4 h-56 w-full">
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

      <h1 className="mb-2 text-center text-3xl font-bold text-foreground">Welcome to Collabor8</h1>
      <p className="mb-8 text-center text-muted-foreground">
        The simple way to manage child maintenance and shared expenses with your co-parent.
      </p>

      <div className="flex flex-col gap-3">
        <Button
          onClick={() => { setAuthMethod("apple"); setStep("role"); }}
          className="w-full gap-3 bg-foreground text-background hover:bg-foreground/90"
          size="lg"
        >
          <Apple className="h-5 w-5" />
          Sign up with Apple
        </Button>

        <Button
          onClick={() => { setAuthMethod("manual"); setStep("role"); }}
          className="w-full bg-clay text-clay-foreground hover:bg-clay/90"
          size="lg"
        >
          Sign up with email
        </Button>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6 text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <button onClick={() => navigate("/login")} className="font-semibold text-foreground">
            Log in
          </button>
        </p>
      </div>
    </motion.div>
  );

  // ── Role (NEW first step) ──
  const renderRole = () => {
    const Card = ({
      value, title, body, icon: Icon,
    }: { value: Role; title: string; body: string; icon: typeof ArrowRight }) => {
      const selected = role === value;
      return (
        <button
          onClick={() => setRole(value)}
          className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-all ${
            selected ? "border-clay bg-clay-soft" : "border-border bg-background hover:border-muted-foreground"
          }`}
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
            selected ? "bg-clay text-clay-foreground" : "bg-muted text-foreground"
          }`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{body}</p>
          </div>
          <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
            selected ? "border-clay bg-clay" : "border-muted-foreground"
          }`}>
            {selected && <Check className="h-3 w-3 text-clay-foreground" />}
          </div>
        </button>
      );
    };

    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Which parent are you?</h1>
        <p className="mb-8 text-muted-foreground">
          Please choose the correct option - it controls which dashboard you see.
        </p>
        <div className="flex flex-col gap-3">
          <Card value="managing" title="The parent making payments" body="You'll set up and manage the arrangement." icon={ArrowRight} />
          <Card value="viewing" title="The parent receiving payments" body="You'll see the arrangement once it's set up." icon={ArrowDownLeft} />
        </div>
        <div className="flex-1" />
        <div className="pb-8 pt-6">
          <Button onClick={() => setStep("name")} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!role}>
            Continue
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderName = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">What's your name?</h1>
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
      </div>
      <div className="flex-1" />
      <div className="pb-8 pt-6">
        <Button onClick={() => setStep("email")} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!isNameValid}>
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderEmail = () => {
    const showFormatError = email.length > 0 && !isEmailFormatValid;
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
        <h1 className="mb-2 text-3xl font-bold text-foreground">What's your email?</h1>
        <p className="mb-8 text-muted-foreground">We'll use this to keep you updated and to verify your account.</p>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="email"
            placeholder="Enter your email"
            aria-label="Email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
            className={`h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay ${
              emailError ? "border-destructive" : ""
            }`}
          />
        </div>
        {(showFormatError || emailError) && (
          <p className="mt-2 text-sm text-destructive">
            {emailError ?? "Please enter a valid email address."}
          </p>
        )}
        <div className="flex-1" />
        <div className="pb-8 pt-6">
          <Button onClick={handleEmailContinue} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!isEmailFormatValid}>
            Continue
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderPassword = () => {
    const Rule = ({ ok, label }: { ok: boolean; label: string }) => (
      <div className={`flex items-center gap-2 text-sm ${ok ? "text-clay" : "text-muted-foreground"}`}>
        <Check className={`h-4 w-4 ${ok ? "opacity-100" : "opacity-30"}`} />
        {label}
      </div>
    );
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
        <h1 className="mb-2 text-3xl font-bold text-foreground">Create a password</h1>
        <p className="mb-6 text-muted-foreground">Use 8+ characters with a number and mixed case.</p>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input type="password" placeholder="Enter your password" aria-label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay" />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          <Rule ok={pwc.length} label="At least 8 characters" />
          <Rule ok={pwc.mixed} label="Mix of upper and lower case" />
          <Rule ok={pwc.number} label="Contains a number" />
        </div>
        <div className="flex-1" />
        <div className="pb-8 pt-6">
          <Button onClick={handlePasswordContinue} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!isPasswordValid || isLoading}>
            {isLoading ? "Checking..." : "Continue"}
          </Button>
        </div>
      </motion.div>
    );
  };

  const renderCoparent = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Invite your co-parent</h1>
      <p className="mb-8 text-muted-foreground">
        After you sign up, your co-parent will receive a unique invite code so they can create their account. You'll also receive a copy of this code.
      </p>
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input type="email" placeholder="Co-parent's email (optional)" aria-label="Co-parent's email address" value={coparentEmail} onChange={(e) => setCoparentEmail(e.target.value)}
          className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-clay" />
      </div>
      {coparentEmail.length > 0 && !isCoparentValid && (
        <p className="mt-2 text-sm text-destructive">Please enter a valid email address.</p>
      )}
      <div className="flex-1" />
      <div className="pb-8 pt-6">
        <Button onClick={finishSignUp} className="mb-3 w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg" disabled={!isCoparentValid || isLoading}>
          {isLoading ? "Finishing..." : "Continue"}
        </Button>
        <Button onClick={finishSignUp} variant="ghost" className="w-full text-muted-foreground" size="lg" disabled={isLoading}>Skip for now</Button>
      </div>
    </motion.div>
  );

  const renderVerify = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-full bg-clay-soft">
        <Check className="h-10 w-10 text-clay" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Account created!</h1>
      <p className="mb-2 text-muted-foreground">Your account has been set up for</p>
      <p className="mb-6 font-semibold text-foreground">{email}</p>

      {generatedCode && (
        <div className="mb-6 w-full rounded-2xl bg-card p-6">
          <p className="mb-2 text-sm text-muted-foreground">Your invite code:</p>
          <p className="text-3xl font-bold tracking-widest text-clay">{generatedCode}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            An invite code has been shared with your co-parent. This is the code they'll use to create their account. You may want to send a copy to them.
          </p>
        </div>
      )}

      <div className="flex-1" />

      <div className="w-full pb-8 pt-6">
        <Button onClick={() => navigate("/dashboard")} className="w-full bg-clay text-clay-foreground hover:bg-clay/90" size="lg">
          Go to Dashboard
        </Button>
      </div>
    </motion.div>
  );

  return (
    <>
      <Helmet>
        <title>Sign Up - Collabor8</title>
        <meta name="description" content="Create your Collabor8 account. Manage child maintenance payments, track expenses, and earn rewards as a co-parent." />
        <link rel="canonical" href="https://collaborate8.com/signup" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
        <div className="px-6 pt-4">
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
            {step !== "verify" && (
              <button onClick={handleBack} aria-label="Go back" className="mb-4 flex h-10 w-10 items-center justify-center">
                <ArrowLeft className="h-5 w-5 text-foreground" />
              </button>
            )}
            {step !== "verify" && renderProgressBar()}
          </motion.div>
        </div>
        <div className="flex flex-1 flex-col px-6">
          <AnimatePresence mode="wait">
            {step === "role" && renderRole()}
            {step === "name" && renderName()}
            {step === "email" && renderEmail()}
            {step === "password" && renderPassword()}
            {step === "coparent" && renderCoparent()}
            
            {step === "verify" && renderVerify()}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default SignUp;
