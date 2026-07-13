import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Clock, AlertTriangle, Receipt } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardHeader from "./DashboardHeader";
import { usePayments } from "@/hooks/usePayments";
import { useProfile } from "@/hooks/useProfile";

const ExpensesTab = () => {
  const { profile, loading: profileLoading } = useProfile();
  const { payments, fetchPayments, loading } = usePayments();

  useEffect(() => {
    fetchPayments();
  }, [profile?.id]);

  const isLoading = loading || profileLoading;

  // Real totals from payment history
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthTotal = payments
    .filter((p) => p.status === "completed" && new Date(p.created_at) >= monthStart)
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const pendingTotal = payments
    .filter((p) => p.status === "pending" || p.status === "processing")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="px-6 pt-12 pb-24">
      <DashboardHeader title="Activity" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-5"
      >
        <p className="text-base font-medium text-foreground">Your payment activity</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Every payment sent or received between you and your co-parent.
        </p>
      </motion.div>

      {/* Stat cards - real data */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">This month</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">£{thisMonthTotal.toFixed(2)}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Pending</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">£{pendingTotal.toFixed(2)}</p>
          )}
        </div>
      </motion.div>

      {/* Activity list */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent activity
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-2xl" />
            <Skeleton className="h-16 w-full rounded-2xl" />
          </div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your payments will show up here once you send or receive one.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((tx) => {
              const isIncoming = tx.payee_id === profile?.id;
              const statusText =
                tx.status === "completed" ? "Completed" :
                tx.status === "failed" ? "Failed" :
                tx.status === "disputed" ? "Disputed" :
                "Pending";
              const statusClass =
                tx.status === "completed" ? "text-emerald-500" :
                tx.status === "failed" || tx.status === "disputed" ? "text-destructive" :
                "text-muted-foreground";

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {tx.status === "completed" ? (
                        isIncoming ? (
                          <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-destructive" />
                        )
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
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "d MMM yyyy")} · {tx.type}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${isIncoming ? "text-emerald-500" : "text-foreground"}`}>
                      {isIncoming ? "+" : "-"}£{Number(tx.amount).toFixed(2)}
                    </p>
                    <p className={`text-xs ${statusClass}`}>{statusText}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ExpensesTab;
