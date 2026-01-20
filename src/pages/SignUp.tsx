import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, User, Check, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type SignUpStep = "name" | "email" | "password" | "coparent" | "subscription" | "verify";

const SignUp = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [step, setStep] = useState<SignUpStep>("name");
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [coparentEmail, setCoparentEmail] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly" | null>(null);

  const isNameValid = firstName.length > 0 && lastName.length > 0;
  const isEmailValid = email.length > 0 && email.includes("@");
  const isPasswordValid = password.length >= 6;
  const isCoparentValid = coparentEmail.length === 0 || coparentEmail.includes("@");
  const isSubscriptionValid = selectedPlan !== null;

  const handleBack = () => {
    switch (step) {
      case "name":
        navigate("/");
        break;
      case "email":
        setStep("name");
        break;
      case "password":
        setStep("email");
        break;
      case "coparent":
        setStep("password");
        break;
      case "subscription":
        setStep("coparent");
        break;
      case "verify":
        setStep("subscription");
        break;
    }
  };

  const getStepIndex = () => {
    switch (step) {
      case "name": return 0;
      case "email": return 1;
      case "password": return 2;
      case "coparent": return 3;
      case "subscription": return 4;
      case "verify": return 5;
      default: return 0;
    }
  };

  const handleSignUp = async () => {
    setIsLoading(true);
    const { error } = await signUp(email, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message || "Failed to create account");
    } else {
      setStep("verify");
    }
  };

  const renderProgressBar = () => {
    const currentStep = getStepIndex();
    return (
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= currentStep ? "bg-foreground" : "bg-muted"
            }`}
          />
        ))}
      </div>
    );
  };

  const renderName = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        What's your name?
      </h1>
      <p className="mb-8 text-muted-foreground">
        Enter your full name as it appears on official documents.
      </p>

      <div className="flex flex-col gap-4">
        <div className="relative">
          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="First name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>

        <div className="relative">
          <User className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Last name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
          />
        </div>
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={() => setStep("email")}
          className="w-full"
          size="lg"
          disabled={!isNameValid}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderEmail = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        What's your email?
      </h1>
      <p className="mb-8 text-muted-foreground">
        We'll use this to keep you updated and to verify your account.
      </p>

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
        />
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={() => setStep("password")}
          className="w-full"
          size="lg"
          disabled={!isEmailValid}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderPassword = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Create a password
      </h1>
      <p className="mb-8 text-muted-foreground">
        Choose a secure password with at least 6 characters.
      </p>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
        />
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={() => setStep("coparent")}
          className="w-full"
          size="lg"
          disabled={!isPasswordValid}
        >
          Continue
        </Button>
      </div>
    </motion.div>
  );

  const renderCoparent = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Invite your co-parent
      </h1>
      <p className="mb-8 text-muted-foreground">
        Enter your co-parent's email to invite them to sign up. You can skip this for now.
      </p>

      <div className="relative">
        <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="email"
          placeholder="Co-parent's email (optional)"
          value={coparentEmail}
          onChange={(e) => setCoparentEmail(e.target.value)}
          className="h-14 rounded-2xl border-border bg-background pl-12 text-foreground placeholder:text-muted-foreground focus:border-foreground"
        />
      </div>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={() => setStep("subscription")}
          className="mb-3 w-full"
          size="lg"
          disabled={!isCoparentValid}
        >
          Continue
        </Button>
        <Button
          onClick={() => setStep("subscription")}
          variant="ghost"
          className="w-full text-muted-foreground"
          size="lg"
        >
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  const renderSubscription = () => (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-1 flex-col"
    >
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Choose your plan
      </h1>
      <p className="mb-8 text-muted-foreground">
        Select a subscription that works best for you.
      </p>

      <div className="flex flex-col gap-4">
        {/* Annual Plan */}
        <button
          onClick={() => setSelectedPlan("annual")}
          className={`relative flex items-center justify-between rounded-2xl border-2 p-5 text-left transition-all ${
            selectedPlan === "annual"
              ? "border-foreground bg-accent"
              : "border-border bg-background hover:border-muted-foreground"
          }`}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">Annual</span>
              <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                Save 17%
              </span>
            </div>
            <p className="mt-1 text-2xl font-bold text-foreground">£49.99<span className="text-base font-normal text-muted-foreground">/year</span></p>
            <p className="mt-1 text-sm text-muted-foreground">That's just £4.17/month</p>
          </div>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selectedPlan === "annual" ? "border-foreground bg-foreground" : "border-muted-foreground"
          }`}>
            {selectedPlan === "annual" && <Check className="h-4 w-4 text-background" />}
          </div>
        </button>

        {/* Monthly Plan */}
        <button
          onClick={() => setSelectedPlan("monthly")}
          className={`relative flex items-center justify-between rounded-2xl border-2 p-5 text-left transition-all ${
            selectedPlan === "monthly"
              ? "border-foreground bg-accent"
              : "border-border bg-background hover:border-muted-foreground"
          }`}
        >
          <div>
            <span className="text-lg font-semibold text-foreground">Monthly</span>
            <p className="mt-1 text-2xl font-bold text-foreground">£4.99<span className="text-base font-normal text-muted-foreground">/month</span></p>
            <p className="mt-1 text-sm text-muted-foreground">Flexible monthly billing</p>
          </div>
          <div className={`flex h-6 w-6 items-center justify-center rounded-full border-2 ${
            selectedPlan === "monthly" ? "border-foreground bg-foreground" : "border-muted-foreground"
          }`}>
            {selectedPlan === "monthly" && <Check className="h-4 w-4 text-background" />}
          </div>
        </button>
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        A small transaction fee applies per payment.
      </p>

      <div className="flex-1" />

      <div className="pb-8 pt-6">
        <Button
          onClick={handleSignUp}
          className="w-full"
          size="lg"
          disabled={!isSubscriptionValid || isLoading}
        >
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

      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Account created!
      </h1>
      <p className="mb-2 text-muted-foreground">
        Your account has been set up for
      </p>
      <p className="mb-8 font-semibold text-foreground">{email}</p>

      <p className="text-sm text-muted-foreground">
        You can now log in and start managing your expenses and arrangements.
      </p>

      <div className="flex-1" />

      <div className="w-full pb-8 pt-6">
        <Button
          onClick={() => navigate("/dashboard")}
          className="mb-3 w-full"
          size="lg"
        >
          Go to Dashboard
        </Button>
        <Button
          onClick={() => navigate("/post-signup")}
          variant="ghost"
          className="w-full text-muted-foreground"
          size="lg"
        >
          Complete onboarding
        </Button>
      </div>
    </motion.div>
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background">
      <div className="px-6 pt-4">
        {/* Header with back button and progress */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <button
            onClick={handleBack}
            className="mb-4 flex h-10 w-10 items-center justify-center"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          {renderProgressBar()}
        </motion.div>
      </div>

      <div className="flex flex-1 flex-col px-6">
        <AnimatePresence mode="wait">
          {step === "name" && renderName()}
          {step === "email" && renderEmail()}
          {step === "password" && renderPassword()}
          {step === "coparent" && renderCoparent()}
          {step === "subscription" && renderSubscription()}
          {step === "verify" && renderVerify()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SignUp;
