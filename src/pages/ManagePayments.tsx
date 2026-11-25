import { useCallback, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, ArrowRight, Check, Clock, CreditCard, History, Landmark, Loader2, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PayingParentSetup from "@/components/dashboard/PayingParentSetup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsInApp } from "@/hooks/useIsInApp";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { useStripeConnect, useStripePayments } from "@/hooks/useStripe";
import { maintenanceRoleGate, resolveConnectStatus } from "@/lib/maintenanceOnboarding";
import { getUpcomingDueDate } from "@/lib/nextDueDate";
import {
  RECEIVER_COPY,
  everyLabel,
  payerBlockMessage,
  poundsLabel,
  receiverPayoutView,
  stripeHeadsUp,
  stripeReturnState,
  type CoparentReady,
} from "@/lib/managePayments";

const Card = ({ children, testId }: { children: React.ReactNode; testId?: string }) => (
  <div data-testid={testId} className="mb-5 rounded-3xl border border-border bg-card p-5">{children}</div>
);

const ManagePayments = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const inApp = useIsInApp();
  const { profile, loading: profileLoading, isManaging, isViewing } = useProfile();
  const { getActivePayment, loading: paymentsLoading } = useRecurringPayments();
  const { cards, fetchCards, cardsLoading } = useStripePayments();
  const { startOnboarding, checkAccountStatus, checkCoparentReady, loading: onboardingLoading } = useStripeConnect();

  const [connectStatus, setConnectStatus] = useState("loading");
  const [coparentName, setCoparentName] = useState<string | null>(null);
  const [coparentArrangement, setCoparentArrangement] = useState<{ amount: number | string; frequency: string; next_due_date?: string | null } | null>(null);
  const [coparentReady, setCoparentReady] = useState<CoparentReady>(null);
  const [extraLoading, setExtraLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [returnedFrom] = useState(() => stripeReturnState(location.search));

  const loadReceiver = useCallback(async () => {
    const [live, stored] = await Promise.all([
      checkAccountStatus(),
      profile?.id
        ? supabase.from("connected_accounts").select("onboarding_status").eq("user_id", profile.id).eq("provider", "stripe").maybeSingle().then(({ data }) => data, () => null)
        : Promise.resolve(null),
    ]);
    setConnectStatus(resolveConnectStatus(live, stored));
  }, [profile?.id]);

  // Everything the role check needs is read once, the same evidence the Child Maintenance screen uses.
  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    (async () => {
      const jobs: PromiseLike<unknown>[] = [loadReceiver(), fetchCards()];
      if (profile.coparent_id) {
        jobs.push(
          supabase.from("profiles").select("first_name").eq("id", profile.coparent_id).maybeSingle().then(({ data }) => { if (!cancelled) setCoparentName(data?.first_name ?? null); }),
          supabase.from("recurring_payments").select("*").eq("user_id", profile.coparent_id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle().then(({ data }) => { if (!cancelled) setCoparentArrangement(data ?? null); }, () => undefined),
        );
        if (isManaging) jobs.push(checkCoparentReady().then((ready) => { if (!cancelled) setCoparentReady(ready); }));
      }
      await Promise.all(jobs);
      if (!cancelled) setExtraLoading(false);
    })();
    return () => { cancelled = true; };
  }, [profile?.id, profile?.coparent_id, isManaging]);

  // Back from Stripe's payout page: say what happened. The status above is read fresh on load.
  useEffect(() => {
    if (returnedFrom === "return" && !extraLoading) {
      if (connectStatus === "complete" || connectStatus === "pending_capabilities") toast.success("Thanks. Your bank account details are with Stripe.");
    }
  }, [returnedFrom, extraLoading, connectStatus]);

  const goToStripePayoutPage = async () => {
    const result = await startOnboarding();
    if (result?.url) window.location.href = result.url;
  };

  const openPortal = async () => {
    setPortalLoading(true);
    const { data, error } = await supabase.functions.invoke("stripe-subscriptions", { body: { action: "customer-portal" } });
    setPortalLoading(false);
    if (error || !data?.url) return toast.error("Could not open Stripe. Please try again.");
    window.location.href = data.url;
  };

  const activePayment = getActivePayment();
  const loading = profileLoading || extraLoading || paymentsLoading || cardsLoading || connectStatus === "loading";
  const localConfirmed = !!profile?.id && localStorage.getItem(`role_confirmed_${profile.id}`) === "true";
  const roleSettled = maintenanceRoleGate({
    localConfirmed,
    role: profile?.role,
    hasOwnArrangement: !!activePayment,
    hasCoparentArrangement: !!coparentArrangement,
    cardCount: cards.length,
    connectStatus,
    evidenceLoading: false,
  }) === "confirmed";

  const header = (
    <>
      <button type="button" onClick={() => navigate("/settings")} className="mb-6 flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
        <ArrowLeft className="h-4 w-4" />
        Back to Settings
      </button>
      <h1 className="text-2xl font-bold text-foreground">Manage payments</h1>
    </>
  );

  const shell = (children: React.ReactNode) => (
    <div className="min-h-screen bg-background">
      <div data-testid="manage-payments" className="mx-auto max-w-md px-6 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-12 md:max-w-2xl">{header}{children}</div>
    </div>
  );

  if (loading) {
    return shell(
      <div className="mt-6 space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>,
    );
  }

  // No payment direction chosen yet: the picker lives on the Child Maintenance tab.
  if ((!isManaging && !isViewing) || !roleSettled) {
    return shell(
      <Card testId="mp-choose-role">
        <p className="font-semibold text-foreground">Will you be making payments or receiving them?</p>
        <p className="mt-1 text-sm text-muted-foreground">Choose this first on the Child Maintenance screen. Then you can manage payments here.</p>
        <Button className="mt-4 min-h-11 w-full gap-2" onClick={() => navigate("/dashboard?tab=maintenance")}>Go to Child Maintenance <ArrowRight className="h-4 w-4" /></Button>
      </Card>,
    );
  }

  // ───────────── Receiving parent ─────────────
  if (isViewing) {
    const view = receiverPayoutView(connectStatus);
    const copy = RECEIVER_COPY[view];
    const due = getUpcomingDueDate(coparentArrangement);
    const from = coparentName ? `from ${coparentName}` : "from your co-parent";
    return shell(
      <>
        <p className="mb-5 mt-2 text-sm text-foreground">You're the receiving parent. Your co-parent sets the amount and how often they pay. You add where it should go.</p>

        <Card testId="mp-expected">
          <p className="text-sm text-muted-foreground">Expected payment</p>
          {coparentArrangement ? (
            <>
              <p className="mt-1 text-4xl font-bold text-foreground">{poundsLabel(Number(coparentArrangement.amount))}</p>
              <p className="mt-1 text-sm text-foreground">{everyLabel(coparentArrangement.frequency)}, {from}</p>
              {due && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Next payment {format(due, "do MMMM yyyy")}</p>}
            </>
          ) : (
            <p className="mt-2 text-sm text-foreground">{coparentName ?? "Your co-parent"} hasn't set up payments yet. You'll see the amount here as soon as they do.</p>
          )}
        </Card>

        <Card testId="mp-payout">
          <div className="flex items-start gap-3">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${view === "done" ? "bg-status-ok/15 text-status-ok" : "bg-primary/15 text-primary"}`}>
              {view === "done" ? <Check className="h-4 w-4" /> : view === "checking" ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold text-foreground">{copy.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{copy.body}</p>
            </div>
          </div>
          {(view === "add" || view === "finish") && <p data-testid="mp-stripe-heads-up" className="mt-3 rounded-xl bg-muted/50 p-3 text-xs leading-relaxed text-foreground">{stripeHeadsUp(user?.email)}</p>}
          {returnedFrom === "refresh" && view !== "done" && <p role="status" className="mt-3 text-sm text-foreground">That Stripe page expired. Tap the button to open a new one.</p>}
          {copy.button && (
            <Button className="mt-4 min-h-11 w-full gap-2" variant={view === "done" ? "outline" : "default"} onClick={() => void goToStripePayoutPage()} disabled={onboardingLoading}>
              {onboardingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : view === "done" ? <Pencil className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}
              {copy.button}
            </Button>
          )}
        </Card>

        <Button variant="ghost" className="min-h-11 w-full gap-2" onClick={() => navigate("/payment-history")}><History className="h-4 w-4" />Payment history</Button>
      </>,
    );
  }

  // ───────────── Paying parent ─────────────
  if (activePayment) {
    const due = getUpcomingDueDate(activePayment);
    return shell(
      <>
        <p className="mb-5 mt-2 text-sm text-foreground">You're the paying parent. This is your current arrangement.</p>
        <Card testId="mp-arrangement">
          <p className="text-sm text-muted-foreground">Your payment</p>
          <p className="mt-1 text-4xl font-bold text-foreground">{poundsLabel(activePayment.amount)}</p>
          <p className="mt-1 text-sm text-foreground">{everyLabel(activePayment.frequency)}{coparentName ? `, to ${coparentName}` : ""}</p>
          {due && <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground"><Clock className="h-4 w-4" />Next payment {format(due, "do MMMM yyyy")}</p>}
          <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CreditCard className="h-3 w-3" />{cards.length > 0 ? `Card ending ${cards[0].last4}` : "Paid through Stripe"}</p>
        </Card>
        <div className="space-y-3">
          <Button variant="outline" className="min-h-11 w-full justify-between" onClick={() => navigate("/edit-payment")}>Change the amount or how often<ArrowRight className="h-4 w-4 shrink-0" /></Button>
          {!inApp && (
            <Button variant="outline" className="h-auto min-h-11 w-full justify-between gap-3 whitespace-normal py-3 text-left" onClick={() => void openPortal()} disabled={portalLoading}>
              <span>Update card or bank details, or stop payments</span>
              {portalLoading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" /> : <ArrowRight className="h-4 w-4 shrink-0" />}
            </Button>
          )}
          <Button variant="ghost" className="min-h-11 w-full gap-2" onClick={() => navigate("/payment-history")}><History className="h-4 w-4" />Payment history</Button>
        </div>
        {!inApp && <p className="mt-3 text-xs text-muted-foreground">Updating or stopping opens Stripe's secure page. You're signed in there automatically.</p>}
      </>,
    );
  }

  return shell(
    <>
      <p className="mt-2 text-sm text-foreground">You're the paying parent. Set the amount and how often, choose how to pay, and finish on Stripe.</p>
      {returnedFrom === "cancelled" && <p role="status" className="mt-3 text-sm text-muted-foreground">You came back before finishing. Nothing was charged. You can pick up where you left off.</p>}
      <div className="mt-5">
        {profile && <PayingParentSetup userId={profile.id} receiverId={profile.coparent_id} arrangement={activePayment} email={user?.email ?? null} blockedMessage={payerBlockMessage(!!profile.coparent_id, coparentReady)} />}
      </div>
    </>,
  );
};

export default ManagePayments;
