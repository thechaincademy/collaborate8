import { useEffect, useState } from "react";
import { ArrowLeft, Check, CalendarIcon, ShieldAlert, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useStripePayments } from "@/hooks/useStripe";
import { toast } from "sonner";

type Frequency = "Weekly" | "Monthly";

const StepShell = ({
  index,
  title,
  active,
  completed,
  summary,
  onOpen,
  children,
}: {
  index: number;
  title: string;
  active: boolean;
  completed: boolean;
  summary?: string;
  onOpen?: () => void;
  children?: React.ReactNode;
}) => {
  return (
    <motion.div
      layout
      className={cn(
        "rounded-2xl border p-5 transition-colors",
        completed
          ? "border-emerald-500/40 bg-emerald-500/5"
          : active
            ? "border-primary bg-card"
            : "border-border bg-card/60"
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        disabled={active}
        className="flex w-full items-center gap-3 text-left"
      >
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
            completed
              ? "bg-emerald-500 text-white"
              : active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
          )}
        >
          {completed ? <Check className="h-4 w-4" /> : index}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-foreground">{title}</p>
          {summary && !active && (
            <p className="mt-0.5 text-sm text-muted-foreground">{summary}</p>
          )}
        </div>
      </button>
      {active && <div className="mt-4">{children}</div>}
    </motion.div>
  );
};

const EditRecurringPayment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isViewing, profile, loading: profileLoading } = useProfile();
  const { getActivePayment, loading, createOrUpdatePayment } = useRecurringPayments();
  const { createSubscriptionCheckout, loading: stripeLoading } = useStripePayments();

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("50.00");
  const [frequency, setFrequency] = useState<Frequency>("Monthly");
  const [firstDate, setFirstDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [completed, setCompleted] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const active = getActivePayment();
    if (active) {
      setAmount(active.amount.toFixed(2));
      const freq = active.frequency.charAt(0).toUpperCase() + active.frequency.slice(1);
      if (freq === "Weekly" || freq === "Monthly") setFrequency(freq as Frequency);
      if (active.next_due_date) setFirstDate(new Date(active.next_due_date));
    }
  }, [loading]);

  const complete = (n: number, next: number) => {
    setCompleted((prev) => ({ ...prev, [n]: true }));
    setStep(next);
  };

  const handleSetUp = async () => {
    if (!user) return;
    setSaving(true);

    const freqLower = frequency.toLowerCase() as "weekly" | "monthly";
    const dayOfMonth = frequency === "Monthly" && firstDate ? firstDate.getDate() : undefined;

    // If co-parent is linked, create Stripe subscription; otherwise, save draft arrangement.
    if (profile?.coparent_id) {
      const result = await createSubscriptionCheckout({
        amount: parseFloat(amount),
        currency: "gbp",
        interval: frequency === "Monthly" ? "month" : "week",
        receiverId: profile.coparent_id,
      });
      setSaving(false);
      if (result?.url) {
        window.location.href = result.url;
        return;
      }
      return;
    }

    const { error } = await createOrUpdatePayment(
      parseFloat(amount),
      freqLower,
      dayOfMonth
    );
    setSaving(false);
    if (!error) {
      toast.success("Arrangement saved. Link your co-parent to start payments.");
      navigate("/dashboard");
    }
  };

  if (!profileLoading && isViewing) {
    return (
      <div className="mx-auto flex min-h-screen w-full max-w-md md:max-w-lg flex-col bg-card px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <ShieldAlert className="mb-6 h-12 w-12 text-muted-foreground" />
          <h1 className="mb-4 text-2xl font-bold">You don't have permission to edit this arrangement</h1>
          <Button onClick={() => navigate(-1)} variant="outline" size="lg">Go Back</Button>
        </div>
      </div>
    );
  }

  const amountNum = parseFloat(amount || "0");
  const step4Ready = completed[1] && completed[2] && completed[3];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md md:max-w-lg flex-col bg-card">
      <div className="px-6 pt-12 pb-24">
        <button onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        <h1 className="mb-2 text-2xl font-bold text-foreground">Set up your arrangement</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Complete each step to schedule your child maintenance payment.
        </p>

        <div className="space-y-3">
          {/* Step 1: Amount */}
          <StepShell
            index={1}
            title="Amount"
            active={step === 1}
            completed={!!completed[1]}
            summary={completed[1] ? `£${amountNum.toFixed(2)}` : undefined}
            onOpen={() => setStep(1)}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-foreground">£</span>
              <Input
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-14 text-2xl"
              />
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!amountNum || amountNum <= 0}
              onClick={() => complete(1, 2)}
            >
              Continue
            </Button>
          </StepShell>

          {/* Step 2: Frequency */}
          <StepShell
            index={2}
            title="Frequency"
            active={step === 2}
            completed={!!completed[2]}
            summary={completed[2] ? frequency : undefined}
            onOpen={() => completed[1] && setStep(2)}
          >
            <div className="grid grid-cols-2 gap-2">
              {(["Weekly", "Monthly"] as Frequency[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFrequency(f)}
                  className={cn(
                    "rounded-xl border p-4 text-center font-medium transition-colors",
                    frequency === f
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <Button className="mt-4 w-full" size="lg" onClick={() => complete(2, 3)}>
              Continue
            </Button>
          </StepShell>

          {/* Step 3: First payment date */}
          <StepShell
            index={3}
            title="When would you like your first payment to be?"
            active={step === 3}
            completed={!!completed[3]}
            summary={completed[3] && firstDate ? format(firstDate, "do MMMM yyyy") : undefined}
            onOpen={() => completed[2] && setStep(3)}
          >
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {firstDate ? format(firstDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={firstDate}
                  onSelect={setFirstDate}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Button
              className="mt-4 w-full"
              size="lg"
              disabled={!firstDate}
              onClick={() => complete(3, 4)}
            >
              Continue
            </Button>
          </StepShell>

          {/* Step 4: Review */}
          <StepShell
            index={4}
            title="Review agreement"
            active={step === 4}
            completed={!!completed[4]}
            onOpen={() => step4Ready && setStep(4)}
          >
            <div className="space-y-2 rounded-xl bg-background p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-medium text-foreground">£{amountNum.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency</span>
                <span className="font-medium text-foreground">{frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">First payment</span>
                <span className="font-medium text-foreground">
                  {firstDate ? format(firstDate, "do MMM yyyy") : "-"}
                </span>
              </div>
              {!profile?.coparent_id && (
                <p className="mt-3 rounded-lg bg-primary/10 p-3 text-xs text-muted-foreground">
                  Your co-parent isn't linked yet. We'll save this arrangement and start payments once they join.
                </p>
              )}
            </div>
            <Button
              className="mt-4 w-full"
              size="lg"
              onClick={handleSetUp}
              disabled={saving || stripeLoading}
            >
              {saving || stripeLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Set up"
              )}
            </Button>
          </StepShell>
        </div>
      </div>
    </div>
  );
};

export default EditRecurringPayment;
