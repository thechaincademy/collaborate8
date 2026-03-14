import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, Check, Calculator, PoundSterling, Search, Loader2, CreditCard, Construction } from "lucide-react";
import { useProfile } from "@/hooks/useProfile";
import { useBanking } from "@/hooks/useBanking";
import { useStripePayments, useStripeConnect } from "@/hooks/useStripe";
import { supabase } from "@/integrations/supabase/client";

type OnboardingStep =
  | "payment-method"
  | "connect-bank"
  | "select-institution"
  | "bank-redirect"
  | "stripe-connect-onboarding"
  | "payment-amount"
  | "payment-frequency"
  | "complete"
  | "waiting-coparent";

const PostSignupOnboarding = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { profile, loading: profileLoading, isViewing } = useProfile();
  const { getInstitutions, linkBank, exchangeConsent, loading: bankLoading } = useBanking();
  const { setupCard, cards, fetchCards, loading: stripeLoading } = useStripePayments();
  const { startOnboarding, loading: connectLoading } = useStripeConnect();

  const [step, setStep] = useState<OnboardingStep>("payment-method");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [useCalculator, setUseCalculator] = useState(false);
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Check if coming from bank callback
  useEffect(() => {
    const consent = searchParams.get("consent");
    const institutionId = searchParams.get("institution");
    const stepParam = searchParams.get("step");

    if (consent && institutionId) {
      exchangeConsent(consent, institutionId).then(() => {
        if (isViewing) {
          setStep("waiting-coparent");
        } else {
          setStep("payment-amount");
        }
      });
    } else if (stepParam === "bank") {
      setStep("connect-bank");
    }
  }, [searchParams]);

  // Determine initial step based on role
  useEffect(() => {
    if (profileLoading) return;
    if (isViewing) {
      setStep("stripe-connect-onboarding");
    }
  }, [profileLoading, isViewing]);

  const handleBack = () => {
    switch (step) {
      case "payment-method": navigate(-1); break;
      case "connect-bank": setStep("payment-method"); break;
      case "select-institution": setStep("connect-bank"); break;
      case "stripe-connect-onboarding": navigate(-1); break;
      case "payment-amount": setStep("payment-method"); break;
      case "payment-frequency": setStep("payment-amount"); break;
      default: break;
    }
  };

  // ── Managing Parent: Add Card ──
  const handleAddCard = async () => {
    const result = await setupCard();
    if (result?.url) {
      window.open(result.url, "_blank");
    }
  };

  const handleSkipToAmount = () => setStep("payment-amount");

  // ── Open Banking (Coming Soon) ──
  const handleConnectBank = async () => {
    setStep("select-institution");
    const banks = await getInstitutions();
    setInstitutions(banks);
  };

  const handleSelectInstitution = async (institution: any) => {
    const callbackUrl = `${window.location.origin}/post-signup?institution=${institution.id}`;
    const result = await linkBank(institution.id, callbackUrl);
    if (result?.authorisationUrl) {
      window.location.href = result.authorisationUrl;
    }
  };

  // ── Viewing Parent: Stripe Connect ──
  const handleStartConnect = async () => {
    const result = await startOnboarding();
    if (result?.url) {
      window.open(result.url, "_blank");
    }
  };

  const handleAmountSubmit = () => setStep("payment-frequency");
  const handleFrequencySubmit = () => setStep("complete");
  const handleFinish = () => navigate("/dashboard");

  const filteredInstitutions = institutions.filter((inst: any) =>
    inst.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Step: Payment Method (Managing Parent) ──
  const renderPaymentMethod = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Add a payment card</h1>
      <p className="mb-8 text-muted-foreground">Add your credit or debit card to set up recurring maintenance payments.</p>

      <div className="mb-6 rounded-2xl bg-card p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <CreditCard className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">Secure card payments</h3>
        <p className="text-sm text-muted-foreground">
          Your card details are securely stored by Stripe. We never see or store your full card number.
        </p>
      </div>

      {/* Open Banking Coming Soon */}
      <button
        className="mb-6 flex items-center gap-4 rounded-2xl bg-card p-4 opacity-50"
        disabled
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">Pay via Open Banking</p>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              Coming Soon
            </span>
          </div>
          <p className="text-sm text-muted-foreground">Direct bank payments</p>
        </div>
      </button>

      <div className="flex-1" />
      <div className="space-y-3 pb-8">
        <Button onClick={handleAddCard} className="w-full gap-2" size="lg" disabled={stripeLoading}>
          <CreditCard className="h-5 w-5" />
          {stripeLoading ? "Loading..." : "Add Card via Stripe"}
        </Button>
        <Button onClick={handleSkipToAmount} variant="ghost" className="w-full text-muted-foreground" size="lg">
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  // ── Step: Stripe Connect Onboarding (Viewing Parent / Receiver) ──
  const renderStripeConnectOnboarding = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Set up payouts</h1>
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
        <Button onClick={() => setStep("waiting-coparent")} variant="ghost" className="w-full text-muted-foreground" size="lg">
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  // ── Step: Open Banking (Coming Soon info page) ──
  const renderConnectBank = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Connect your bank</h1>
      <p className="mb-8 text-muted-foreground">Securely link your bank account via Open Banking for seamless payments.</p>
      <div className="mb-6 rounded-2xl bg-card p-6">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
          <Building2 className="h-6 w-6 text-foreground" />
        </div>
        <h3 className="mb-2 font-semibold text-foreground">Bank-grade security</h3>
        <p className="text-sm text-muted-foreground">Your financial data is encrypted and secure. We use Open Banking to connect safely.</p>
      </div>
      <div className="flex-1" />
      <div className="space-y-3 pb-8">
        <Button onClick={handleConnectBank} className="w-full" size="lg" disabled={bankLoading}>
          {bankLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</> : "Connect Bank Account"}
        </Button>
        <Button onClick={handleSkipToAmount} variant="ghost" className="w-full text-muted-foreground" size="lg">
          Skip for now
        </Button>
      </div>
    </motion.div>
  );

  const renderSelectInstitution = () => (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="flex flex-1 flex-col">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Select your bank</h1>
      <p className="mb-6 text-muted-foreground">Choose your bank to securely connect.</p>
      <div className="relative mb-4">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search banks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-12 rounded-2xl border-border bg-card pl-12 text-foreground placeholder:text-muted-foreground"
        />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto">
        {bankLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInstitutions.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">No banks found</p>
        ) : (
          filteredInstitutions.slice(0, 20).map((inst: any) => (
            <button
              key={inst.id}
              onClick={() => handleSelectInstitution(inst)}
              className="flex w-full items-center gap-4 rounded-2xl bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              {inst.media?.[0]?.source ? (
                <img src={inst.media[0].source} alt={inst.name} className="h-10 w-10 rounded-xl object-contain" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="font-medium text-foreground">{inst.name}</p>
                <p className="text-xs text-muted-foreground">{inst.countries?.[0]?.countryCode2 || "UK"}</p>
              </div>
            </button>
          ))
        )}
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

  const showBackButton = !["complete", "waiting-coparent", "bank-redirect"].includes(step);

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
          {step === "payment-method" && renderPaymentMethod()}
          {step === "connect-bank" && renderConnectBank()}
          {step === "select-institution" && renderSelectInstitution()}
          {step === "stripe-connect-onboarding" && renderStripeConnectOnboarding()}
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
