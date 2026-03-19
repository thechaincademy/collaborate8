import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowUpRight, ArrowDownLeft, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { usePayments } from "@/hooks/usePayments";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import MobileLayout from "@/components/layout/MobileLayout";

const PaymentHistory = () => {
  const navigate = useNavigate();
  const { payments, loading, fetchPayments } = usePayments();
  const { profile, loading: profileLoading } = useProfile();

  useEffect(() => {
    fetchPayments();
  }, []);

  const isLoading = loading || profileLoading;

  return (
    <MobileLayout>
      <div className="px-6 pt-12 pb-24">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Payment History</h1>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
            ))
          ) : payments.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No payments yet</p>
          ) : (
            payments.map((tx, index) => {
              const isIncoming = tx.payee_id === profile?.id;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {tx.status === "completed" ? (
                        isIncoming ? <ArrowDownLeft className="h-4 w-4 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 text-destructive" />
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
      </div>
    </MobileLayout>
  );
};

export default PaymentHistory;
