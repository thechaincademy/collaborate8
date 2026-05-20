import { useEffect } from "react";
import { motion } from "framer-motion";
import { PoundSterling, Receipt, Gift, MessageCircle, BookOpen, ArrowRight, Clock } from "lucide-react";
import { format } from "date-fns";
import DashboardHeader from "./DashboardHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { useProfile } from "@/hooks/useProfile";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { usePayments } from "@/hooks/usePayments";
import { DashboardTab } from "@/pages/Dashboard";

interface HomeTabProps {
  onNavigate: (tab: DashboardTab) => void;
}

const quickLinks: Array<{
  tab: DashboardTab;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { tab: "maintenance", label: "Maintenance", description: "Track your recurring payments", icon: PoundSterling },
  { tab: "expenses", label: "Expenses", description: "Log and split shared costs", icon: Receipt },
  { tab: "benefits", label: "Benefits", description: "Rewards for subscribers", icon: Gift },
  { tab: "chat", label: "Chat", description: "Stay in touch with your co-parent", icon: MessageCircle },
  { tab: "resources", label: "Resources", description: "Guides and tools", icon: BookOpen },
];

const HomeTab = ({ onNavigate }: HomeTabProps) => {
  const { profile, loading: profileLoading } = useProfile();
  const { getActivePayment, loading: paymentsLoading } = useRecurringPayments();
  const { payments, fetchPayments, loading: historyLoading } = usePayments();

  useEffect(() => {
    fetchPayments();
  }, []);

  const activePayment = getActivePayment();
  const nextDueDate = activePayment?.next_due_date ? new Date(activePayment.next_due_date) : null;
  const lastPayment = payments[0];

  const firstName = profile?.first_name?.trim();
  const greeting = firstName ? `Hi, ${firstName}` : "Welcome back";

  const isLoading = profileLoading || paymentsLoading;

  return (
    <div className="px-6 pt-12">
      <DashboardHeader title="Home" />

      {/* Greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-foreground">{greeting}</h2>
        <p className="text-sm text-muted-foreground">Here's a snapshot of your co-parenting today.</p>
      </motion.div>

      {/* Summary card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-3xl border border-primary/40 bg-primary/10 p-6"
      >
        {isLoading ? (
          <>
            <Skeleton className="mb-2 h-4 w-28" />
            <Skeleton className="mb-3 h-10 w-32" />
            <Skeleton className="h-4 w-40" />
          </>
        ) : activePayment ? (
          <>
            <p className="text-sm text-foreground/70">Next payment</p>
            <h3 className="my-1 text-4xl font-bold text-foreground">£{activePayment.amount.toFixed(2)}</h3>
            <div className="flex items-center gap-2 text-sm text-foreground/70">
              <Clock className="h-4 w-4" />
              <span>{nextDueDate ? `Due ${format(nextDueDate, "do MMM yyyy")}` : "Processing..."}</span>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-foreground/70">No arrangement yet</p>
            <h3 className="my-1 text-2xl font-bold text-foreground">Set up your first payment</h3>
            <button
              onClick={() => onNavigate("maintenance")}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-foreground"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </button>
          </>
        )}
      </motion.div>

      {/* Quick stats row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-8 grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Last payment</p>
          {historyLoading ? (
            <Skeleton className="mt-2 h-6 w-20" />
          ) : lastPayment ? (
            <>
              <p className="mt-1 text-xl font-bold text-foreground">£{lastPayment.amount.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(lastPayment.created_at), "d MMM")}</p>
            </>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">No activity yet</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">Role</p>
          <p className="mt-1 text-xl font-bold capitalize text-foreground">
            {profile?.role ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">Co-parent {profile?.coparent_id ? "linked" : "not linked"}</p>
        </div>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="pb-24"
      >
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Where to next
        </h3>
        <div className="space-y-3">
          {quickLinks.map((link, i) => (
            <motion.button
              key={link.tab}
              onClick={() => onNavigate(link.tab)}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
              className="flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <link.icon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{link.label}</p>
                <p className="truncate text-sm text-muted-foreground">{link.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default HomeTab;
