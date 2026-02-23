import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Check, Calculator, PoundSterling } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";

type OnboardingStep = 
  | "connect-bank" 
  | "payment-amount" 
  | "payment-frequency" 
  | "complete"
  | "waiting-coparent";

const PostSignupOnboarding = () => {
  const navigate = useNavigate();
  const { profile, loading: profileLoading, isViewing } = useProfile();
  const [step, setStep] = useState<OnboardingStep>("connect-bank");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [useCalculator, setUseCalculator] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");

  const handleBack = () => {
    switch (step) {
      case "connect-bank":
        navigate(-1);
        break;
      case "payment-amount":
        setStep("connect-bank");
        break;
      case "payment-frequency":
        setStep("payment-amount");
        break;
      case "complete":
      case "waiting-coparent":
        break;
    }
  };

  const handleBankConnected = () => {
    if (isViewing) {
      setStep("waiting-coparent");
    } else {
      setStep("payment-amount");
    }
  };

  const handleAmountSubmit = () => {
    setStep("payment-frequency");
  };

  const handleFrequencySubmit = () => {
    setStep("complete");
  };

  const handleFinish = () => {
    navigate("/dashboard");
  };

  const renderConnectBank = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Connect your bank</h1>
      <p className="mb-8 text-muted-foreground">Securely link your bank account for seamless payments.</p>
      <div className="mb-6 rounded-2xl bg-card p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">Bank-grade security</h3>
        <p className="text-sm text-muted-foreground">Your financial data is encrypted and secure. We use Open Banking to connect safely.</p>
      </div>
      <div className="flex-1" />
      <Button onClick={handleBankConnected} className="w-full" size="lg">Connect Bank Account</Button>
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
      <p className="mb-8 text-muted-foreground">Your maintenance arrangement is ready. Payments will be processed automatically.</p>
      <Button onClick={handleFinish} className="w-full" size="lg">Go to Dashboard</Button>
    </motion.div>
  );

  const renderWaitingCoparent = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card">
        <Building2 className="h-10 w-10 text-foreground" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Bank connected!</h1>
      <p className="mb-8 text-muted-foreground">
        Your co-parent manages the maintenance arrangement. You'll be able to view it once they've set it up.
      </p>
      <Button onClick={handleFinish} className="w-full" size="lg">Go to Dashboard</Button>
    </motion.div>
  );

  const showBackButton = step !== "complete" && step !== "waiting-coparent";

  if (profileLoading) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center bg-background px-6">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-background px-6">
      {showBackButton && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="pt-12">
          <button onClick={handleBack} className="mb-6 flex h-10 w-10 items-center justify-center">
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
        </motion.div>
      )}
      <div className={`flex flex-1 flex-col pb-8 ${!showBackButton ? "pt-12" : ""}`}>
        <AnimatePresence mode="wait">
          {step === "connect-bank" && renderConnectBank()}
          {step === "payment-amount" && renderPaymentAmount()}
          {step === "payment-frequency" && renderPaymentFrequency()}
          {step === "complete" && renderComplete()}
          {step === "waiting-coparent" && renderWaitingCoparent()}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PostSignupOnboarding;
