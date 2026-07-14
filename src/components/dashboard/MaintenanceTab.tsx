import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Info, CreditCard, AlertTriangle, RefreshCw, ArrowUpRight, ArrowDownLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { useProfile } from "@/hooks/useProfile";
import { usePayments } from "@/hooks/usePayments";
import { useStripePayments, useStripeConnect } from "@/hooks/useStripe";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const MaintenanceTab = () => {
  const navigate = useNavigate();
  const { getActivePayment, loading } = useRecurringPayments();
  const { isViewing, isManaging, profile, loading: profileLoading, updateProfile } = useProfile();
  const { payments: paymentHistory, fetchPayments } = usePayments();
  const { cards, cardsLoading, fetchCards, setupCard, loading: stripeLoading } = useStripePayments();
  const { checkAccountStatus, startOnboarding } = useStripeConnect();
  const [connectStatus, setConnectStatus] = useState<string>("loading");
  const [coparentArrangement, setCoparentArrangement] = useState<any>(null);
  const [coparentArrangementLoading, setCoparentArrangementLoading] = useState(true);
  const [roleConfirmed, setRoleConfirmed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return false; // set below in effect once we know user id
  });
  const [roleSaving, setRoleSaving] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    setRoleConfirmed(localStorage.getItem(`role_confirmed_${profile.id}`) === "true");
  }, [profile?.id]);

  const handleChooseRole = async (chosen: "managing" | "viewing") => {
    if (!profile?.id) return;
    setRoleSaving(true);
    await updateProfile({ role: chosen });
    localStorage.setItem(`role_confirmed_${profile.id}`, "true");
    setRoleConfirmed(true);
    setRoleSaving(false);
  };

  useEffect(() => {
    fetchPayments();
    fetchCards();

    // Everyone needs to check their Connect status now (bilateral)
    checkAccountStatus().then((s) => {
      setConnectStatus(s?.status ?? "not_created");
    });

    if (!profile?.coparent_id) {
      setCoparentArrangement(null);
      setCoparentArrangementLoading(false);
      return;
    }

    setCoparentArrangementLoading(true);
    supabase
      .from("recurring_payments")
      .select("*")
      .eq("user_id", profile.coparent_id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        setCoparentArrangement(data ?? null);
        setCoparentArrangementLoading(false);
      }, () => {
        setCoparentArrangement(null);
        setCoparentArrangementLoading(false);
      });
  }, [profile?.id, profile?.coparent_id]);

  const activePayment = getActivePayment();

  // For receiver, show co-parent's arrangement
  const displayArrangement = isViewing ? coparentArrangement : activePayment;
  const amount = displayArrangement?.amount ?? 0;
  const nextDueDate = displayArrangement?.next_due_date
    ? new Date(displayArrangement.next_due_date)
    : null;
  const isStripe = displayArrangement?.provider === "stripe";
  const subscriptionStatus = isStripe ? "active" : displayArrangement?.is_active ? "active" : "inactive";
  const isContentLoading = loading || profileLoading || cardsLoading || coparentArrangementLoading || connectStatus === "loading";

  const handleSetupCard = async () => {
    const result = await setupCard();
    if (result?.url) window.location.href = result.url;
  };

  const handleConnectOnboarding = async () => {
    const result = await startOnboarding();
    if (result?.url) window.location.href = result.url;
  };

  const statusLabel = {
    active: { text: "Active", className: "text-emerald-500" },
    past_due: { text: "Past Due", className: "text-amber-500" },
    failed: { text: "Failed", className: "text-destructive" },
    inactive: { text: "Not Set Up", className: "text-muted-foreground" },
    canceled: { text: "Cancelled", className: "text-muted-foreground" },
  };

  const currentStatus = isContentLoading
    ? { text: "Loading...", className: "text-muted-foreground" }
    : statusLabel[subscriptionStatus as keyof typeof statusLabel] || statusLabel.inactive;

  // Skeleton for the status card area
  const renderStatusSkeleton = () => (
    <div className="mb-6 rounded-3xl bg-card p-6">
      <div className="mb-1 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="mb-4 h-10 w-36" />
      <Skeleton className="h-4 w-48" />
    </div>
  );

  // Skeleton for action buttons area
  const renderActionsSkeleton = () => (
    <div className="mb-6 space-y-3">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  );

  // Role selection gate — shown once, before the arrangement UI is unlocked.
  if (!profileLoading && profile && !roleConfirmed) {
    return (
      <div className="px-6 pt-12">
        <DashboardHeader title="Child Maintenance" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-3xl border border-border bg-card p-6"
        >
          <h2 className="mb-2 text-xl font-semibold text-foreground">
            Will you be making payments or receiving them?
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Please select the correct answer — this unlocks your ability to set up an arrangement.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => handleChooseRole("managing")}
              disabled={roleSaving}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-border bg-background p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <ArrowRight className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">I'll be making payments</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You set up and manage the arrangement.
                </p>
              </div>
            </button>
            <button
              onClick={() => handleChooseRole("viewing")}
              disabled={roleSaving}
              className="flex w-full items-start gap-4 rounded-2xl border-2 border-border bg-background p-4 text-left transition-colors hover:border-primary disabled:opacity-60"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <ArrowDownLeft className="h-5 w-5 text-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">I'll be receiving payments</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your co-parent sets things up. You'll confirm where funds arrive.
                </p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="px-6 pt-12">
      <DashboardHeader title="Child Maintenance" />


      {/* Status Card */}
      {isContentLoading ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {renderStatusSkeleton()}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 rounded-3xl border border-border bg-card p-6"
        >
          <div className="mb-1 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {isViewing ? "Expected payment" : "Next payment"}
            </p>
            <span className={`text-xs font-semibold ${currentStatus.className}`}>
              {currentStatus.text}
            </span>
          </div>
          <h2 className="mb-4 text-4xl font-bold text-foreground">
            £{amount.toFixed(2)}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {nextDueDate
                ? `Due ${format(nextDueDate, "do MMMM yyyy")}`
                : displayArrangement
                  ? "Processing..."
                  : ""}
            </span>
          </div>
          {isStripe && isManaging && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <CreditCard className="h-3 w-3" />
              <span>Paid via card{cards.length > 0 ? ` (****${cards[0].last4})` : ""}</span>
            </div>
          )}
          {!displayArrangement && (
            <p className="mt-3 text-sm font-medium text-muted-foreground">no arrangement set up</p>
          )}
        </motion.div>
      )}


      {/* Setup Section: Managing = card only; Viewing = payout only */}
      {isContentLoading ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          {renderActionsSkeleton()}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 space-y-3"
        >
          {/* MANAGING (payer): card to send */}
          {isManaging && cards.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Add your preferred card to get your arrangement set up</p>
                </div>
              </div>
              <Button onClick={handleSetupCard} className="w-full gap-2" size="lg" disabled={stripeLoading}>
                <CreditCard className="h-5 w-5" />
                {stripeLoading ? "Loading..." : "Select your preferred payment method"}
              </Button>
            </div>
          )}


          {isManaging && cards.length > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <Check className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-foreground">Card added - you can send payments (****{cards[0].last4})</p>
            </div>
          )}

          {/* VIEWING (receiver): payout account */}
          {isViewing && (connectStatus === "not_created" || connectStatus === "pending") && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">Set up payout account</p>
                  <p className="text-sm text-muted-foreground">
                    Complete verification to receive payments from your co-parent.
                  </p>
                </div>
              </div>
              <Button onClick={handleConnectOnboarding} className="w-full gap-2" size="lg">
                <CreditCard className="h-5 w-5" />
                Set Up to Receive Payments
              </Button>
            </div>
          )}

          {isViewing && connectStatus === "pending_capabilities" && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <RefreshCw className="h-5 w-5 animate-spin text-amber-500" />
              <div>
                <p className="font-medium text-foreground">Payout account under review</p>
                <p className="text-sm text-muted-foreground">
                  Your payout account is being verified. This usually takes a few minutes.
                </p>
              </div>
            </div>
          )}

          {isViewing && connectStatus === "complete" && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <Check className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-foreground">Payouts enabled - you can receive payments</p>
            </div>
          )}

          {/* Arrangement actions for managing parent (payer) */}
          {isManaging && cards.length > 0 && (
            <>
              {!displayArrangement ? (
                <button
                  onClick={() => navigate("/edit-payment")}
                  className="w-full rounded-2xl border border-primary/40 bg-primary/10 p-5 text-left transition-colors hover:bg-primary/15"
                >
                  <p className="font-semibold text-foreground">You're nearly there</p>
                  <p className="mt-1 text-sm text-muted-foreground">Click here to set up payment.</p>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button className="h-auto flex-col gap-2 py-4" variant="outline" onClick={() => navigate("/payment-history")}>
                    <span className="font-medium">Payment History</span>
                  </Button>
                  <Button
                    className="h-auto flex-col gap-2 py-4"
                    variant="outline"
                    onClick={() => navigate("/edit-payment")}
                  >
                    <span className="font-medium">Manage Arrangement</span>
                  </Button>
                </div>
              )}
            </>
          )}

          {/* Info for viewing parent */}
          {isViewing && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Your co-parent manages this arrangement</p>
            </div>
          )}
        </motion.div>
      )}


      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Payments</h3>
          {paymentHistory.length > 3 && (
            <Button variant="link" className="text-sm text-primary p-0 h-auto" onClick={() => navigate("/payment-history")}>
              See all
            </Button>
          )}
        </div>
        <div className="space-y-3 pb-24">
          {paymentHistory.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No payments yet</p>
          ) : (
            paymentHistory.slice(0, 3).map((tx, index) => {
              const isIncoming = tx.payee_id === profile?.id;
              const directionIcon = isIncoming ? (
                <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
              ) : (
                <ArrowUpRight className="h-4 w-4 text-destructive" />
              );

              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="flex w-full items-center justify-between rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {tx.status === "completed" ? (
                        directionIcon
                      ) : tx.status === "failed" || tx.status === "disputed" ? (
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {isIncoming ? "Payment received" : "Payment sent"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), "d MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isIncoming ? "text-emerald-500" : "text-foreground"}`}>
                      {isIncoming ? "+" : "-"}£{tx.amount.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      tx.status === "completed" ? "text-emerald-500" :
                      tx.status === "failed" || tx.status === "disputed" ? "text-destructive" :
                      "text-muted-foreground"
                    }`}>
                      {tx.status === "completed" ? "Completed" :
                       tx.status === "failed" ? "Failed" :
                       tx.status === "disputed" ? "Disputed" :
                       "Pending"}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceTab;
