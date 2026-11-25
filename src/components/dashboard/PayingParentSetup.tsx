import { useEffect, useState } from "react";
import { addDays, format, parseISO, startOfDay } from "date-fns";
import { Check, Landmark, Loader2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { trackBeforeRedirect, amountBucket } from "@/lib/analytics";
import { useStripePayments } from "@/hooks/useStripe";
import type { RecurringPayment } from "@/hooks/useRecurringPayments";
import {
  BANK_UNAVAILABLE_CODE,
  BANK_UNAVAILABLE_TEXT,
  PAYMENT_CHOICES,
  frequencyLabel,
  parseChoice,
  payerReviewNote,
  poundsLabel,
  validAmount,
  type PaymentChoice,
} from "@/lib/managePayments";

// One Stripe trip, at the end. Collabor8 shows the amount and how often, the payer picks card or bank,
// then Stripe Checkout collects the card or sets up the Direct Debit with the payer's email already filled in.
const steps = [
  { title: "Amount and how often", description: "Enter the amount, how often you pay and the start date." },
  { title: "How you'd like to pay", description: "Choose card or bank account. You add the details on Stripe's secure page, and Collabor8 never stores them. Your co-parent never sees them either." },
  { title: "Review and confirm", description: "Check the details, then continue to Stripe to finish. Both parents will be notified." },
];

interface Props {
  userId: string;
  receiverId: string | null;
  arrangement: RecurringPayment | null;
  /** The payer's own sign-in email. Stripe already holds it, so it is only shown for reassurance. */
  email?: string | null;
  /** Why the payer cannot continue yet (co-parent not linked or not ready to be paid), or null. */
  blockedMessage?: string | null;
}

export default function PayingParentSetup({ userId, receiverId, arrangement, email, blockedMessage = null }: Props) {
  const { createSubscriptionCheckout, getSubscriptionStatus, loading, checkoutErrorCode } = useStripePayments();
  const [amount, setAmount] = useState("50.00");
  const [frequency, setFrequency] = useState<"week" | "month">("month");
  const [startDate, setStartDate] = useState(format(addDays(new Date(), 7), "yyyy-MM-dd"));
  const [choice, setChoice] = useState<PaymentChoice>("card");
  const [detailsSaved, setDetailsSaved] = useState(false);
  const [methodSaved, setMethodSaved] = useState(false);
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
      setChoice(parseChoice(draft.choice));
      setDetailsSaved(draft.detailsSaved === true);
      setMethodSaved(draft.detailsSaved === true && draft.methodSaved === true);
    } catch { /* Invalid drafts never complete a payment step. */ }
  }, [storageKey]);

  // Stripe said bank payments are not switched on: go back to the choice with card selected.
  useEffect(() => {
    if (checkoutErrorCode !== BANK_UNAVAILABLE_CODE) return;
    setChoice("card");
    setMethodSaved(false);
    setError(BANK_UNAVAILABLE_TEXT);
  }, [checkoutErrorCode]);

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

  const today = format(new Date(), "yyyy-MM-dd");
  const amountNumber = Number(amount);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !Number.isNaN(parseISO(startDate).getTime()) && startDate >= today;
  const valid = validAmount(amount) && validDate;
  const methodDone = detailsSaved && methodSaved;

  const persist = (next: { detailsSaved: boolean; methodSaved: boolean; choice?: PaymentChoice; amount?: string; frequency?: "week" | "month"; startDate?: string }) =>
    sessionStorage.setItem(storageKey, JSON.stringify({ amount, frequency, startDate, choice, ...next }));

  const saveDetails = () => {
    if (!valid) return;
    setError("");
    setDetailsSaved(true);
    persist({ detailsSaved: true, methodSaved });
  };

  const saveMethod = () => {
    if (!detailsSaved) return;
    setError("");
    setMethodSaved(true);
    persist({ detailsSaved: true, methodSaved: true });
  };

  const editDetails = (apply: () => void) => {
    apply();
    setDetailsSaved(false);
    setMethodSaved(false);
  };

  const confirm = async () => {
    if (!valid || !methodDone || live || blockedMessage) return;
    if (!receiverId) { setError("Link your co-parent before confirming your arrangement."); return; }
    const selectedDate = startOfDay(parseISO(startDate));
    const delayed = startDate !== today;
    if (delayed && selectedDate.getTime() < Date.now() + 48 * 60 * 60 * 1000) {
      setError("Choose today or a start date at least three days from today.");
      return;
    }
    setError("");
    const result = await createSubscriptionCheckout({
      amount: amountNumber,
      currency: "gbp",
      interval: frequency,
      receiverId,
      startDate: selectedDate.toISOString(),
      returnToMaintenance: true,
      paymentMethod: choice,
      returnTo: "manage-payments",
    });
    if (result?.url) {
      await trackBeforeRedirect("payment_started", { product: "maintenance_subscription", interval: frequency, amount_bucket: amountBucket(amountNumber), method: choice });
      window.location.assign(result.url);
    }
  };

  return (
    <section aria-label="Payment setup" className="pt-2 pb-[calc(1rem+env(safe-area-inset-bottom))]">
      {blockedMessage && !live && <p role="status" className="mb-5 rounded-2xl border border-border bg-muted/40 p-4 text-sm text-foreground">{blockedMessage}</p>}
      <ol className="space-y-0">
        {steps.map((item, index) => {
          const unlocked = index === 0 || (index === 1 ? detailsSaved : methodDone);
          const done = index === 0 ? detailsSaved : index === 1 ? methodDone : live;
          return (
            <li key={item.title} aria-disabled={!unlocked} aria-current={unlocked && !done ? "step" : undefined} className="relative flex gap-3 pb-7 last:pb-0">
              {index < 2 && <span aria-hidden="true" className="absolute bottom-0 left-4 top-9 w-px bg-border" />}
              <span className={cn("relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold", unlocked ? "bg-teal text-teal-foreground" : "bg-muted text-muted-foreground")}>{index + 1}</span>
              <div className={cn("min-w-0 flex-1 pt-1", !unlocked && "opacity-50")}>
                <div className="flex items-start gap-2">
                  <h3 className={cn("flex-1 text-base font-bold", unlocked ? "text-foreground" : "text-muted-foreground")}>{item.title}</h3>
                  {done && <Check aria-label={`${item.title} completed`} className="h-5 w-5 shrink-0 text-gold" strokeWidth={3} />}
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                {index === 0 && !live && (
                  <fieldset disabled={loading} className="mt-4 min-w-0 space-y-3">
                    <div className="space-y-1.5"><Label htmlFor="setup-amount">Amount (£)</Label><Input id="setup-amount" type="number" inputMode="decimal" min="0.50" step="0.01" value={amount} onChange={(e) => editDetails(() => setAmount(e.target.value))} /></div>
                    <div className="space-y-1.5"><Label>Frequency</Label><div role="group" aria-label="Payment frequency" className="grid grid-cols-2 gap-2">{(["week", "month"] as const).map((value) => <Button key={value} type="button" variant="outline" aria-pressed={frequency === value} onClick={() => editDetails(() => setFrequency(value))} className={cn(frequency === value && "border-teal bg-teal/10 text-teal")}>{frequencyLabel(value)}</Button>)}</div></div>
                    <div className="space-y-1.5"><Label htmlFor="setup-start-date">Start date</Label><Input id="setup-start-date" type="date" min={today} value={startDate} onChange={(e) => editDetails(() => setStartDate(e.target.value))} className="block w-full min-w-0 scroll-mb-[calc(7rem+env(safe-area-inset-bottom))]" /></div>
                    <Button onClick={saveDetails} disabled={!valid || loading || detailsSaved} className="w-full scroll-mb-[calc(7rem+env(safe-area-inset-bottom))] bg-teal text-teal-foreground hover:bg-teal/90">Continue</Button>
                  </fieldset>
                )}
                {index === 1 && !live && (
                  <fieldset disabled={!unlocked || loading} className="mt-4 min-w-0 space-y-3">
                    <div role="radiogroup" aria-label="How you'd like to pay" className="space-y-2">
                      {PAYMENT_CHOICES.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={choice === opt.value}
                          data-testid={`pay-choice-${opt.value}`}
                          onClick={() => { setChoice(opt.value); setMethodSaved(false); }}
                          className={cn("flex min-h-11 w-full items-start gap-3 rounded-2xl border-2 bg-background p-4 text-left transition-colors", choice === opt.value ? "border-teal bg-teal/10" : "border-border hover:border-teal/60")}
                        >
                          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted">{opt.value === "card" ? <CreditCard className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}</span>
                          <span className="min-w-0 flex-1"><span className="block font-semibold text-foreground">{opt.title}</span><span className="mt-0.5 block text-sm text-muted-foreground">{opt.detail}</span></span>
                          <span aria-hidden="true" className={cn("mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", choice === opt.value ? "border-teal bg-teal text-teal-foreground" : "border-border")}>{choice === opt.value && <Check className="h-3 w-3" strokeWidth={4} />}</span>
                        </button>
                      ))}
                    </div>
                    <Button onClick={saveMethod} disabled={!unlocked || loading || methodSaved} className="w-full scroll-mb-[calc(7rem+env(safe-area-inset-bottom))] bg-teal text-teal-foreground hover:bg-teal/90">Continue</Button>
                  </fieldset>
                )}
                {index === 2 && !live && (
                  <div className="mt-4">
                    {methodDone && (
                      <>
                        <dl className="mb-3 space-y-2 text-sm">
                          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Amount</dt><dd className="font-medium">{poundsLabel(amountNumber)}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Frequency</dt><dd className="font-medium">{frequencyLabel(frequency)}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Start date</dt><dd className="font-medium">{validDate ? format(parseISO(startDate), "d MMM yyyy") : "-"}</dd></div>
                          <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Pay by</dt><dd className="font-medium">{choice === "bank" ? "Bank account (Direct Debit)" : "Card"}</dd></div>
                        </dl>
                        <p className="mb-4 text-xs leading-relaxed text-muted-foreground">{payerReviewNote(choice, email)}</p>
                      </>
                    )}
                    {error && <p role="alert" className="mb-3 text-sm text-destructive">{error}</p>}
                    <Button data-testid="confirm-arrangement" onClick={confirm} disabled={!unlocked || !valid || loading || !!blockedMessage} className="w-full gap-2 scroll-mb-[calc(7rem+env(safe-area-inset-bottom))] bg-teal text-teal-foreground hover:bg-teal/90">{loading && <Loader2 className="h-4 w-4 animate-spin" />}{loading ? "Opening Stripe..." : "Continue to Stripe"}</Button>
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
