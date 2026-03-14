import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Clock, Info, CreditCard, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { useProfile } from "@/hooks/useProfile";
import { usePayments } from "@/hooks/usePayments";
import { useStripePayments, useStripeConnect } from "@/hooks/useStripe";
import { format, addMonths, setDate } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

const MaintenanceTab = () => {
  const navigate = useNavigate();
  const { getActivePayment, loading } = useRecurringPayments();
  const { isViewing, isManaging, profile, loading: profileLoading } = useProfile();
  const { payments: paymentHistory, fetchPayments } = usePayments();
  const { cards, fetchCards, setupCard, loading: stripeLoading } = useStripePayments();
  const { checkAccountStatus } = useStripeConnect();
  const [connectStatus, setConnectStatus] = useState<string>("not_created");
  const [coparentArrangement, setCoparentArrangement] = useState<any>(null);

  useEffect(() => {
    fetchPayments();
    fetchCards();
    if (isViewing) {
      checkAccountStatus().then((s) => {
        if (s) setConnectStatus(s.status);
      });
      // Fetch co-parent's arrangement for receiver view
      if (profile?.coparent_id) {
        supabase
          .from("recurring_payments")
          .select("*")
          .eq("user_id", profile.coparent_id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .then(({ data }) => {
            if (data) setCoparentArrangement(data);
          });
      }
    }
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

  const handleSetupCard = async () => {
    const result = await setupCard();
    if (result?.url) {
      window.open(result.url, "_blank");
    }
  };

  const handleConnectOnboarding = async () => {
    const { startOnboarding } = await import("@/hooks/useStripe").then(m => ({
      startOnboarding: new (m.useStripeConnect as any)()
    })).catch(() => ({ startOnboarding: null }));
    // Simpler approach: invoke directly
    const { data } = await supabase.functions.invoke("stripe-connect", {
      body: { action: "create-account" },
    });
    if (data?.url) {
      window.open(data.url, "_blank");
    }
  };

  const statusLabel = {
    active: { text: "Active", className: "text-emerald-500" },
    past_due: { text: "Past Due", className: "text-amber-500" },
    failed: { text: "Failed", className: "text-destructive" },
    inactive: { text: "Not Set Up", className: "text-muted-foreground" },
    canceled: { text: "Cancelled", className: "text-muted-foreground" },
  };

  const currentStatus = statusLabel[subscriptionStatus as keyof typeof statusLabel] || statusLabel.inactive;

  return (
    <div className="px-6 pt-12">
      <DashboardHeader title="Child Maintenance" />

      {/* Status Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 rounded-3xl bg-card p-6"
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
          {loading || profileLoading ? "Loading..." : `£${amount.toFixed(2)}`}
        </h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            {nextDueDate
              ? `Due ${format(nextDueDate, "do MMMM yyyy")}`
              : displayArrangement
                ? "Processing..."
                : "No arrangement set"}
          </span>
        </div>
        {isStripe && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="h-3 w-3" />
            <span>Paid via card{cards.length > 0 ? ` (****${cards[0].last4})` : ""}</span>
          </div>
        )}
      </motion.div>

      {/* Payer Quick Actions */}
      {isManaging && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 space-y-3"
        >
          {cards.length === 0 ? (
            <Button
              onClick={handleSetupCard}
              className="w-full gap-2"
              size="lg"
              disabled={stripeLoading}
            >
              <CreditCard className="h-5 w-5" />
              {stripeLoading ? "Loading..." : "Add Payment Card"}
            </Button>
          ) : !displayArrangement ? (
            <Button
              onClick={() => navigate("/edit-payment")}
              className="w-full gap-2"
              size="lg"
            >
              Set Up Recurring Payment
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <Button className="h-auto flex-col gap-2 py-4" variant="outline">
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
        </motion.div>
      )}

      {/* Receiver Actions */}
      {isViewing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 space-y-3"
        >
          {connectStatus === "not_created" || connectStatus === "pending" ? (
            <div className="rounded-2xl bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-medium text-foreground">Complete payout setup</p>
                  <p className="text-sm text-muted-foreground">
                    Set up your account to receive payments from your co-parent.
                  </p>
                </div>
              </div>
              <Button onClick={handleConnectOnboarding} className="w-full gap-2" size="lg">
                <CreditCard className="h-5 w-5" />
                Set Up Payouts
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
              <Check className="h-5 w-5 text-emerald-500" />
              <p className="text-sm text-foreground">Payouts enabled — you'll receive payments automatically</p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
            <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Your co-parent manages this arrangement</p>
          </div>
        </motion.div>
      )}

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Payments</h3>
        <div className="space-y-3 pb-24">
          {paymentHistory.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No payments yet</p>
          ) : (
            paymentHistory.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="flex w-full items-center justify-between rounded-2xl bg-card p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {tx.status === "completed" ? (
                      <Check className="h-5 w-5 text-emerald-500" />
                    ) : tx.status === "failed" || tx.status === "disputed" ? (
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    ) : (
                      <Clock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Maintenance payment</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-foreground">
                    {isViewing ? "+" : "-"}£{tx.amount.toFixed(2)}
                  </p>
                  <p className={`text-xs ${
                    tx.status === "completed" ? "text-emerald-500" :
                    tx.status === "failed" ? "text-destructive" :
                    tx.status === "disputed" ? "text-destructive" :
                    "text-muted-foreground"
                  }`}>
                    {tx.status === "completed" ? "Completed" :
                     tx.status === "failed" ? "Failed" :
                     tx.status === "disputed" ? "Disputed" :
                     "Pending"}
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceTab;
