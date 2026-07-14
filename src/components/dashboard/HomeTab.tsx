import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  PoundSterling,
  Receipt,
  Gift,
  MessageCircle,
  BookOpen,
  ArrowRight,
  Clock,
  ChevronRight,
  Check,
  AlertCircle,
  Copy,
  Mail,
  Loader2,
} from "lucide-react";
import { format, subMonths } from "date-fns";
import DashboardHeader from "./DashboardHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { usePayments } from "@/hooks/usePayments";
import { useExpenses } from "@/hooks/useExpenses";
import { DashboardTab } from "@/pages/Dashboard";
import familyImage from "@/assets/home-family.jpg";

interface HomeTabProps {
  onNavigate: (tab: DashboardTab) => void;
}

const quickLinks: Array<{
  tab: DashboardTab;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  { tab: "chat", label: "Chat", description: "Stay in touch with your co-parent", icon: MessageCircle },
  { tab: "benefits", label: "Benefits", description: "Rewards for subscribers", icon: Gift },
  { tab: "resources", label: "Resources", description: "Guides and tools", icon: BookOpen },
];

const HomeTab = ({ onNavigate }: HomeTabProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile();
  const { getActivePayment, loading: paymentsLoading } = useRecurringPayments();
  const { payments, fetchPayments, loading: historyLoading } = usePayments();
  const { expenses, loading: expensesLoading } = useExpenses();

  const [statusOpen, setStatusOpen] = useState(false);
  const [invitation, setInvitation] = useState<{ invitee_email: string | null } | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("invitations")
      .select("invitee_email")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setInvitation(data ?? null));
  }, [user]);

  const activePayment = getActivePayment();
  const nextDueDate = activePayment?.next_due_date ? new Date(activePayment.next_due_date) : null;

  const firstName = profile?.first_name?.trim();
  const greeting = firstName ? `Hi, ${firstName}` : "Welcome back";

  const oneMonthAgo = useMemo(() => subMonths(new Date(), 1), []);
  const monthlyPaymentsTotal = useMemo(
    () =>
      payments
        .filter((p) => new Date(p.created_at) >= oneMonthAgo)
        .reduce((sum, p) => sum + Number(p.amount), 0),
    [payments, oneMonthAgo]
  );
  const monthlyExpensesTotal = useMemo(
    () =>
      expenses
        .filter((e) => new Date(e.created_at) >= oneMonthAgo)
        .reduce((sum, e) => sum + Number(e.amount), 0),
    [expenses, oneMonthAgo]
  );

  const isLoading = profileLoading || paymentsLoading;
  const isLinked = !!profile?.coparent_id;
  const inviteCode = profile?.invite_code ?? "";
  const coparentEmail = invitation?.invitee_email ?? user?.email ?? "";

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    try {
      await navigator.clipboard.writeText(inviteCode);
      if (navigator.share) {
        await navigator.share({
          title: "Link with me on Collabor8",
          text: `Use this code to link with me on Collabor8: ${inviteCode}`,
        }).catch(() => {});
      }
      toast.success("Code copied to clipboard");
    } catch {
      toast.error("Could not copy code");
    }
  };

  const handleResendEmail = async () => {
    if (!coparentEmail || !inviteCode) {
      toast.error("Missing co-parent email");
      return;
    }
    setResending(true);
    const { error } = await supabase.functions.invoke("send-invite-email", {
      body: {
        recipientEmail: coparentEmail,
        inviteCode,
        senderName: `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim(),
      },
    });
    setResending(false);
    if (error) toast.error("Could not resend email");
    else toast.success("Invite email sent");
  };

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
        <p className="text-sm text-muted-foreground">A snapshot of your activity in the last month.</p>
      </motion.div>

      {/* Family image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.03 }}
        className="mb-6 overflow-hidden rounded-3xl border border-border bg-card"
      >
        <img
          src={familyImage}
          alt="Family illustration"
          width={1024}
          height={1024}
          loading="lazy"
          className="h-40 w-full object-cover"
        />
      </motion.div>

      {/* Snapshot options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 grid grid-cols-2 gap-3"
      >
        <button
          onClick={() => navigate("/statement/maintenance")}
          className="rounded-2xl border border-primary/40 bg-primary/10 p-4 text-left transition-colors hover:bg-primary/15"
        >
          <div className="mb-2 flex items-center justify-between">
            <PoundSterling className="h-5 w-5 text-primary" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium text-foreground/70">Monthly payments</p>
          {historyLoading ? (
            <Skeleton className="mt-2 h-6 w-20" />
          ) : (
            <p className="mt-1 text-xl font-bold text-foreground">£{monthlyPaymentsTotal.toFixed(2)}</p>
          )}
        </button>
        <button
          onClick={() => navigate("/statement/expenses")}
          className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
        >
          <div className="mb-2 flex items-center justify-between">
            <Receipt className="h-5 w-5 text-primary" />
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-xs font-medium text-foreground/70">Expenses</p>
          {expensesLoading ? (
            <Skeleton className="mt-2 h-6 w-20" />
          ) : (
            <p className="mt-1 text-xl font-bold text-foreground">£{monthlyExpensesTotal.toFixed(2)}</p>
          )}
        </button>
      </motion.div>

      {/* Next payment card - only shown when active */}
      {(isLoading || activePayment) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="mb-6 rounded-3xl border border-border bg-card p-6"
        >
          {isLoading ? (
            <>
              <Skeleton className="mb-2 h-4 w-28" />
              <Skeleton className="mb-3 h-10 w-32" />
              <Skeleton className="h-4 w-40" />
            </>
          ) : activePayment ? (
            <>
              <p className="text-sm text-muted-foreground">Next payment</p>
              <h3 className="my-1 text-4xl font-bold text-foreground">£{activePayment.amount.toFixed(2)}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>{nextDueDate ? `Due ${format(nextDueDate, "do MMM yyyy")}` : "Processing..."}</span>
              </div>
            </>
          ) : null}
        </motion.div>
      )}

      {/* Co-parent status tab */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={() => setStatusOpen(true)}
        className="mb-8 flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
      >
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            isLinked ? "bg-emerald-500/15 text-emerald-600" : "bg-primary/15 text-primary"
          }`}
        >
          {isLinked ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="font-semibold text-foreground">
            {isLinked ? "Co-parent linked" : "Waiting for co-parent to link"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
      </motion.button>

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

      {/* Status dialog */}
      <Dialog open={statusOpen} onOpenChange={setStatusOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{isLinked ? "Co-parent linked" : "Link your co-parent"}</DialogTitle>
            <DialogDescription>
              {isLinked
                ? "You're linked with your co-parent."
                : coparentEmail
                  ? `An email was sent to your co-parent at ${coparentEmail}.`
                  : "Share your unique code with your co-parent so they can link with you."}
            </DialogDescription>
          </DialogHeader>

          {!isLinked && (
            <>
              <button
                onClick={handleCopyCode}
                className="mt-2 w-full rounded-2xl border border-primary/40 bg-primary/10 p-5 text-center transition-colors hover:bg-primary/15"
              >
                <p className="text-xs uppercase tracking-wider text-muted-foreground">Your unique code</p>
                <p className="mt-1 text-3xl font-bold tracking-widest text-foreground">
                  {inviteCode || "------"}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">Tap to copy</p>
              </button>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={handleResendEmail}
                  disabled={resending || !coparentEmail}
                  className="gap-2"
                >
                  {resending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                  Re-send email
                </Button>
                <Button onClick={handleCopyCode} className="gap-2" disabled={!inviteCode}>
                  <Copy className="h-4 w-4" />
                  Copy code
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HomeTab;
