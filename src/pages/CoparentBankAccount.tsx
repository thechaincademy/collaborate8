import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStripeConnect, type ConnectedAccountStatus } from "@/hooks/useStripe";

/**
 * Bank numbers are not collected here. Stripe Connect hosted onboarding collects them.
 * The app calls stripe-connect { action: "create-account" }, opens the returned url,
 * then { action: "check-status" }.
 */
const CoparentBankAccount = () => {
  const navigate = useNavigate();
  const { startOnboarding, checkAccountStatus, loading } = useStripeConnect();
  const [status, setStatus] = useState<ConnectedAccountStatus | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAccountStatus().then((next) => {
      setStatus(next);
      setChecking(false);
    });
  }, []);

  const openStripe = async () => {
    const result = await startOnboarding();
    if (result?.url) window.location.href = result.url;
  };

  const payoutLabel = status?.payoutsEnabled
    ? "Stripe payouts are enabled."
    : status?.status === "pending" || status?.status === "pending_capabilities"
      ? "Stripe is still finishing payout setup."
      : "Stripe has not collected payout details yet.";

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 pb-28 pt-12 md:max-w-2xl">
        <button type="button" onClick={() => navigate("/dashboard")} className="mb-6 flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="text-2xl font-bold text-foreground">Payout details</h1>
        <p className="mt-2 text-sm text-foreground">
          Collabor8 does not store sort codes or account numbers. Stripe collects payout details on their hosted page.
        </p>
        <div className="mt-6 rounded-3xl border border-border bg-card p-5">
          {checking ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <p className="text-sm text-foreground">{payoutLabel}</p>
          )}
          <Button type="button" className="mt-4 min-h-11 w-full" onClick={() => void openStripe()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : status?.status === "not_created" || !status ? "Set up payouts with Stripe" : "Update payout details with Stripe"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CoparentBankAccount;
