import { useEffect, useState } from "react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { Check, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useStripePayments } from "@/hooks/useStripe";
import type { RecurringPayment } from "@/hooks/useRecurringPayments";

const steps = [
  { title: "Connect your account", description: "Connect your bank account or preferred payment method. This information is only ever visible to you - your co-parent will never see your account details, your balance or your transaction history." },
  { title: "Set up your arrangement", description: "Enter the amount, frequency and start date." },
  { title: "Review and confirm", description: "Check the details and confirm. Both parents will be notified." },
];

interface Props {
  connected: boolean;
  userId: string;
  receiverId: string | null;
  arrangement: RecurringPayment | null;
  onConnect: () => Promise<void>;
  connecting: boolean;
}

export default function PayingParentSetup({ connected, userId, receiverId, arrangement, onConnect, connecting }: Props) {
  const { createSubscriptionCheckout, getSubscriptionStatus, loading } = useStripePayments();
  const [amount, setAmount] = useState("50.00");
  const [frequency, setFrequency] = useState<"week" | "month">("month");
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [reviewReady, setReviewReady] = useState(false);
  const [live, setLive] = useState(false);
  const [error, setError] = useState("");
  const storageKey = `c8-maintenance-draft-${userId}`;

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (!stored) return;
      const draft = JSON.parse(stored);
      if (typeof draft.amount === "string") setAmount(draft.amount);
      if (draft.frequency === "week" || draft.frequency === "month") setFrequency(draft.frequency);
      if (typeof draft.startDate === "string") setStartDate(draft.startDate);
      setReviewReady(draft.reviewReady === true);
    } catch { /* Invalid drafts never complete a payment step. */ }
  }, [storageKey]);

  useEffect(() => {
    let cancelled = false;
    setLive(false);
    const subscriptionId = arrangement?.is_active && arrangement.provider === "stripe" ? arrangement.provider_subscription_id : null;
    if (!subscriptionId) return;
    const verify = async () => {
      const status = await getSubscriptionStatus(subscriptionId);
      if (!cancelled && (status?.status === "active" || status?.status === "trialing")) {
        setLive(true);
        sessionStorage.removeItem(storageKey);
      }
    };
    void verify();
    const poll = window.setInterval(verify, 20000);
    return () => { cancelled = true; window.clearInterval(poll); };
  }, [arrangement?.provider_subscription_id, arrangement?.is_active, storageKey]);

  const accountDone = connected || live;
  const detailsDone = accountDone && (reviewReady || live);
  const today = format(new Date(), "yyyy-MM-dd");
  const amountNumber = Number(amount);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !Number.isNaN(parseISO(startDate).getTime()) && startDate >= today;
  const valid = Number.isFinite(amountNumber) && amountNumber >= 0.50 && Math.abs(amountNumber * 100 - Math.round(amountNumber * 100)) < 0.00001 && validDate;

  const saveDetails = () => {
    if (!valid || !accountDone) return;
    setError("");
    setReviewReady(true);
    sessionStorage.setItem(storageKey, JSON.stringify({ amount, frequency, startDate, reviewReady: true }));
  };

  const confirm = async () => {
    if (!valid || !detailsDone || live) return;
    if (!receiverId) { setError("Link your co-parent before confirming your arrangement."); return; }
    const selectedDate = startOfDay(parseISO(startDate));
    const delayed = startDate !== today;
    if (delayed && selectedDate.getTime() < Date.now() + 48 * 60 * 60 * 1000) {
      setError("Choose today or a start date at least three days from today.");
      return;
    }
    setError("");
    const result = await createSubscriptionCheckout({ amount: amountNumber, currency: "gbp", interval: frequency, receiverId, startDate: selectedDate.toISOString(), returnToMaintenance: true });
    if (result?.url) window.location.assign(result.url);
  };

  return (
    <section aria-label="Payment setup" className="py-2">
      <ol className="space-y-0">
        {steps.map((item, index) => {
          const unlocked = index === 0 || (index === 1 ? accountDone : detailsDone);
          const done = index === 0 ? accountDone : index === 1 ? detailsDone : live;
          return (
            <li key={item.title} aria-disabled={!unlocked} aria-current={unlocked && !done ? "step" : undefined} className="relative flex gap-3 pb-7 last:pb-0">
              {index < 2 && <span aria-hidden="true" className="absolute bottom-0 left-4 top-9 w-px bg-border" />}
              <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", unlocked ? "bg-teal text-teal-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</span>
              <div className={cn("min-w-0 flex-1 pt-1", !unlocked && "opacity-50")}>
                <div className="flex items-start gap-2">
                  <h3 className={cn("flex-1 text-base font-bold", unlocked ? "text-navy" : "text-muted-foreground")}>{item.title}</h3>
                  {done && <Check aria-label={`${item.title} completed`} className="h-5 w-5 shrink-0 text-gold" strokeWidth={3} />}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                {index === 0 && !accountDone && <Button onClick={onConnect} disabled={connecting} className="mt-4 w-full gap-2 bg-teal text-teal-foreground hover:bg-teal/90"><CreditCard className="h-4 w-4" />{connecting ? "Connecting..." : "Connect your account"}</Button>}
                {index === 1 && !live && (
                  <fieldset disabled={!unlocked || loading} className="mt-4 min-w-0 space-y-3">
                    <div className="space-y-1.5"><Label htmlFor="setup-amount">Amount (£)</Label><Input id="setup-amount" type="number" inputMode="decimal" min="0.50" step="0.01" value={amount} onChange={(e) => { setAmount(e.target.value); setReviewReady(false); }} /></div>
                    <div className="space-y-1.5"><Label>Frequency</Label><div role="group" aria-label="Payment frequency" className="grid grid-cols-2 gap-2">{(["week", "month"] as const).map((value) => <Button key={value} type="button" variant="outline" aria-pressed={frequency === value} onClick={() => { setFrequency(value); setReviewReady(false); }} className={cn(frequency === value && "border-teal bg-teal/10 text-teal")}>{value === "week" ? "Weekly" : "Monthly"}</Button>)}</div></div>
                    <div className="space-y-1.5"><Label htmlFor="setup-start-date">Start date</Label><Input id="setup-start-date" type="date" min={today} value={startDate} onChange={(e) => { setStartDate(e.target.value); setReviewReady(false); }} className="block w-full min-w-0" /></div>
                    <Button onClick={saveDetails} disabled={!unlocked || !valid || loading} className="w-full bg-teal text-teal-foreground hover:bg-teal/90">Continue</Button>
                  </fieldset>
                )}
                {index === 2 && !live && (
                  <div className="mt-4">
                    {detailsDone && <dl className="mb-4 space-y-2 text-sm"><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Amount</dt><dd className="font-medium">£{amountNumber.toFixed(2)}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Frequency</dt><dd className="font-medium">{frequency === "week" ? "Weekly" : "Monthly"}</dd></div><div className="flex justify-between gap-2"><dt className="text-muted-foreground">Start date</dt><dd className="font-medium">{validDate ? format(parseISO(startDate), "d MMM yyyy") : "-"}</dd></div></dl>}
                    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
                    <Button onClick={confirm} disabled={!unlocked || !valid || loading} className="w-full gap-2 bg-teal text-teal-foreground hover:bg-teal/90">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Confirming..." : "Confirm arrangement"}</Button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {live && <div role="status" className="mt-5 flex items-center gap-2 rounded-lg bg-teal px-4 py-3 font-semibold text-teal-foreground"><Check className="h-5 w-5 text-gold" />Your arrangement is live.</div>}
    </section>
  );
}