import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Check, Calculator, PoundSterling, Loader2, CreditCard } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useStripePayments, useStripeConnect } from "@/hooks/useStripe";

type OnboardingStep =
  | "setup-card"
  | "setup-connect"
  | "payment-amount"
  | "payment-frequency"
  | "complete"
  | "waiting-coparent";

const PostSignupOnboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading: profileLoading, isViewing, isManaging } = useProfile();
  const { setupCard, cards, fetchCards, loading: stripeLoading } = useStripePayments();
  const { startOnboarding, loading: connectLoading } = useStripeConnect();

  const [step, setStep] = useState<OnboardingStep>("setup-card");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [useCalculator, setUseCalculator] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");

  useEffect(() => {
    fetchCards();
  }, []);

  // Determine initial step based on role
  useEffect(() => {
    if (profileLoading) return;
    if (isViewing) {
      // Viewing parent: first set up Connect (to receive), then card (to send)
      setStep("setup-connect");
    } else {
      // Managing parent: first card (to send), then Connect (to receive)
      setStep("setup-card");
    }
  }, [profileLoading, isViewing]);

  const handleBack = () => {
    switch (step) {
      case "setup-card":
        navigate(-1);
        break;
      case "setup-connect":
        if (isViewing) navigate(-1);
        else setStep("setup-card");
        break;
      case "payment-amount":
        setStep("setup-connect");
        break;
      case "payment-frequency":
        setStep("payment-amount");
        break;
      default:
        break;
    }
  };

  const handleAddCard = async () => {
    const result = await setupCard();
    if (result?.url) window.open(result.url, "_blank");
  };

  const handleStartConnect = async () => {
    const result = await startOnboarding();
    if (result?.url) window.open(result.url, "_blank");
  };

  const handleCardNext = () => {
    setStep("setup-connect");
  };

  const handleConnectNext = () => {
    if (isManaging) {
      setStep("payment-amount");
    } else {
      setStep("waiting-coparent");
    }
  };

  const handleAmountSubmit = () => setStep("payment-frequency");
  const handleFrequencySubmit = () => setStep("complete");
  const handleFinish = () => navigate("/dashboard");

  // ── Step: Add Card (to SEND payments) ──
  const renderSetupCard = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Add a payment card</h1>
      <p className="mb-8 text-muted-foreground">Add your credit or debit card to send maintenance payments to your co-parent.</p>

      <div className="mb-6 rounded-2xl bg-card p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <CreditCard className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">Secure card payments</h3>
        <p className="text-sm text-muted-foreground">
          Your card details are securely stored by Stripe. We never see or store your full card number.
        </p>
      </div>

      <div className="flex-1" />
      <div className="space-y-3 pb-8">
        <Button onClick={handleAddCard} className="w-full gap-2" size="lg" disabled={stripeLoading}>
          <CreditCard className="h-5 w-5" />
          {stripeLoading ? "Loading..." : "Add Card via Stripe"}
        </Button>
        <Button onClick={handleCardNext} variant="ghost" className="w-full text-muted-foreground" size="lg">
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  // ── Step: Set Up Connect (to RECEIVE payments) ──
  const renderSetupConnect = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Set up to receive payments</h1>
      <p className="mb-8 text-muted-foreground">Complete a quick verification so you can receive maintenance payments from your co-parent.</p>

      <div className="mb-6 rounded-2xl bg-card p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <CreditCard className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">Powered by Stripe</h3>
        <p className="text-sm text-muted-foreground">
          We use Stripe Connect to securely verify your identity and send payouts directly to your bank account. The setup takes about 5 minutes.
        </p>
      </div>

      <div className="flex-1" />
      <div className="space-y-3 pb-8">
        <Button onClick={handleStartConnect} className="w-full gap-2" size="lg" disabled={connectLoading}>
          {connectLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : "Start Verification"}
        </Button>
        <Button onClick={handleConnectNext} variant="ghost" className="w-full text-muted-foreground" size="lg">
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  const renderPaymentAmount = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Set payment amount</h1>
      <p className="mb-8 text-muted-foreground">Enter the maintenance amount or use our calculator.</p>
      {!useCalculator ? (
        <>
          <div className="relative mb-4">
            <PoundSterling className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input type="number" placeholder="Enter amount" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
              className="h-14 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground" />
          </div>
          <button onClick={() => setUseCalculator(true)} className="mb-6 flex items-center gap-2 rounded-2xl bg-card p-4 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <Calculator className="h-5 w-5 text-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Use the calculator</p>
              <p className="text-sm text-muted-foreground">Calculate the recommended amount</p>
            </div>
          </button>
        </>
      ) : (
        <div className="mb-6 rounded-2xl bg-card p-6">
          <h3 className="mb-4 font-semibold text-foreground">Child Maintenance Calculator</h3>
          <p className="mb-4 text-sm text-muted-foreground">Based on UK guidelines, the recommended amount considers income, number of children, and overnight stays.</p>
          <div className="rounded-xl bg-muted p-4 text-center">
            <p className="text-sm text-muted-foreground">Recommended amount</p>
            <p className="text-3xl font-bold text-foreground">£320.00</p>
            <p className="text-sm text-muted-foreground">per month</p>
          </div>
          <Button onClick={() => { setPaymentAmount("320"); setUseCalculator(false); }} className="mt-4 w-full" size="lg">
            Use This Amount
          </Button>
        </div>
      )}
      <div className="flex-1" />
      <Button onClick={handleAmountSubmit} className="w-full" size="lg" disabled={!paymentAmount}>Continue</Button>
    </motion.div>
  );

  const renderPaymentFrequency = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Payment frequency</h1>
      <p className="mb-8 text-muted-foreground">How often would you like to make payments?</p>
      <div className="mb-6 space-y-3">
        <button onClick={() => setFrequency("monthly")}
          className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${frequency === "monthly" ? "border-foreground bg-card" : "border-transparent bg-card"}`}>
          <p className="font-semibold text-foreground">Monthly</p>
          <p className="text-sm text-muted-foreground">Pay £{paymentAmount} once a month</p>
        </button>
        <button onClick={() => setFrequency("weekly")}
          className={`w-full rounded-2xl border-2 p-4 text-left transition-all ${frequency === "weekly" ? "border-foreground bg-card" : "border-transparent bg-card"}`}>
          <p className="font-semibold text-foreground">Weekly</p>
          <p className="text-sm text-muted-foreground">Pay £{(parseFloat(paymentAmount) / 4).toFixed(2)} per week</p>
        </button>
      </div>
      <div className="flex-1" />
      <Button onClick={handleFrequencySubmit} className="w-full" size="lg">Finish Setup</Button>
    </motion.div>
  );

  const renderComplete = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card">
        <Check className="h-10 w-10 text-foreground" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">You're all set!</h1>
      <p className="mb-8 text-muted-foreground">Your maintenance arrangement is ready. You can finalise the recurring payment from your dashboard.</p>
      <Button onClick={handleFinish} className="w-full" size="lg">Go to Dashboard</Button>
    </motion.div>
  );

  const renderWaitingCoparent = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card">
        <Check className="h-10 w-10 text-foreground" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">You're set up!</h1>
      <p className="mb-8 text-muted-foreground">
        Your co-parent manages the maintenance arrangement. You'll receive payments automatically once they set things up.
      </p>
      <Button onClick={handleFinish} className="w-full" size="lg">Go to Dashboard</Button>
    </motion.div>
  );

  const showBackButton = !["complete", "waiting-coparent"].includes(step);

  if (profileLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-background px-6">
        <Helmet>
          <title>Getting Started - Collabor8</title>
          <meta name="description" content="Set up your Collabor8 account. Connect your payment method and configure child maintenance arrangements." />
          <link rel="canonical" href="https://collaborate8.com/post-signup" />
        </Helmet>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Getting Started - Collabor8</title>
        <meta name="description" content="Set up your Collabor8 account. Connect your payment method and configure child maintenance arrangements." />
        <link rel="canonical" href="https://collaborate8.com/post-signup" />
      </Helmet>
      <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6">
        {showBackButton && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-12">
            <button onClick={handleBack} aria-label="Go back" className="mb-6 flex h-10 w-10 items-center justify-center">
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
          </motion.div>
        )}
        <div className={`flex flex-1 flex-col pb-8 ${!showBackButton ? "pt-12" : ""}`}>
          <AnimatePresence mode="wait">
            {step === "setup-card" && renderSetupCard()}
            {step === "setup-connect" && renderSetupConnect()}
            {step === "payment-amount" && renderPaymentAmount()}
            {step === "payment-frequency" && renderPaymentFrequency()}
            {step === "complete" && renderComplete()}
            {step === "waiting-coparent" && renderWaitingCoparent()}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default PostSignupOnboarding;
