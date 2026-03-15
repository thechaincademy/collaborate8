import { useState, useEffect } from "react";
import { ArrowLeft, ChevronDown, Check, ShieldAlert, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useRecurringPayments } from "@/hooks/useRecurringPayments";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useStripePayments } from "@/hooks/useStripe";
import { toast } from "sonner";

const repeatOptions = ["Weekly", "Monthly"] as const;
const days = Array.from({ length: 28 }, (_, i) => i + 1);

const EditRecurringPayment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isViewing, profile, loading: profileLoading } = useProfile();
  const { getActivePayment, loading } = useRecurringPayments();
  const { cards, cardsLoading, fetchCards, setupCard, createSubscription, cancelSubscription, loading: stripeLoading } = useStripePayments();

  const [amount, setAmount] = useState("50.00");
  const [repeat, setRepeat] = useState<"Weekly" | "Monthly">("Monthly");
  const [selectedDay, setSelectedDay] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCards();
    const activePayment = getActivePayment();
    if (activePayment) {
      setAmount(activePayment.amount.toFixed(2));
      const freq = activePayment.frequency.charAt(0).toUpperCase() + activePayment.frequency.slice(1);
      if (freq === "Weekly" || freq === "Monthly") setRepeat(freq as any);
      if (activePayment.day_of_month) setSelectedDay(activePayment.day_of_month);
    }
  }, [loading]);

  const handleKeyPress = (key: string) => {
    if (key === "delete") {
      setAmount((prev) => {
        const newVal = prev.replace(".", "").slice(0, -1) || "0";
        return (parseInt(newVal, 10) / 100).toFixed(2);
      });
    } else if (key === ".") {
      return;
    } else {
      setAmount((prev) => {
        const current = prev.replace(".", "");
        const newVal = current + key;
        const num = parseInt(newVal, 10);
        if (num > 9999999) return prev;
        return (num / 100).toFixed(2);
      });
    }
  };

  const handleSetupCard = async () => {
    const result = await setupCard();
    if (result?.url) window.open(result.url, "_blank");
  };

  const handleSave = async () => {
    if (!user || !profile?.coparent_id) {
      toast.error("Please connect with your co-parent first");
      return;
    }

    if (cards.length === 0) {
      toast.error("Please add a payment card first");
      return;
    }

    setIsSaving(true);
    const interval = repeat.toLowerCase() as "week" | "month";

    const result = await createSubscription({
      amount: parseFloat(amount),
      currency: "gbp",
      interval,
      receiverId: profile.coparent_id,
    });

    setIsSaving(false);
    if (result) {
      navigate("/dashboard");
    }
  };

  const handleCancel = async () => {
    const activePayment = getActivePayment();
    if (activePayment?.provider_subscription_id) {
      setIsSaving(true);
      await cancelSubscription(activePayment.provider_subscription_id);
      setIsSaving(false);
      navigate("/dashboard");
    }
  };

  // Show permission denied for viewing parents
  if (!profileLoading && isViewing) {
    return (
      <div className="flex min-h-screen flex-col bg-card">
        <div className="px-6 pt-12">
          <div className="mb-8">
            <button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-6 w-6 text-foreground" />
            </button>
          </div>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mb-4 text-2xl font-bold text-foreground">
            You don't have permission to edit this arrangement
          </h1>
          <p className="mb-8 max-w-sm text-muted-foreground">
            If you'd like to change the maintenance arrangement, you would need to seek legal advice or apply to the court for a variation of the existing order.
          </p>
          <Button onClick={() => navigate(-1)} variant="outline" size="lg" className="w-full max-w-xs">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const activePayment = getActivePayment();
  const hasActiveSubscription = !!activePayment?.provider_subscription_id;

  return (
    <div className="flex min-h-screen flex-col bg-card">
      <div className="px-6 pt-12">
        <div className="mb-8 flex items-center justify-between">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6 text-foreground" />
          </button>
          {!hasActiveSubscription && (
            <button
              onClick={handleSave}
              className="font-medium text-foreground disabled:opacity-50"
              disabled={isSaving || stripeLoading || cardsLoading}
            >
              {isSaving ? "Creating..." : "Create"}
            </button>
          )}
        </div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">
          {hasActiveSubscription ? "Manage Payment" : "Set Up Recurring Payment"}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {hasActiveSubscription
            ? "Your recurring payment is active and processing automatically."
            : "Set up an automatic payment to your co-parent via credit card."}
        </p>

        {/* Card Status */}
        <div className="mb-4 rounded-2xl border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-foreground">Payment Method</p>
                <p className="text-sm text-muted-foreground">
                  {cards.length > 0
                    ? `${cards[0].brand.charAt(0).toUpperCase() + cards[0].brand.slice(1)} ****${cards[0].last4}`
                    : "No card on file"}
                </p>
              </div>
            </div>
            {cards.length === 0 && (
              <Button size="sm" variant="outline" onClick={handleSetupCard} disabled={stripeLoading}>
                Add Card
              </Button>
            )}
          </div>
        </div>

        {!hasActiveSubscription && (
          <>
            {/* Amount */}
            <div className="mb-4 rounded-2xl border border-border bg-background p-4">
              <p className="mb-2 text-center text-sm text-muted-foreground">Payment Amount</p>
              <p className="text-center text-4xl font-bold text-foreground">£ {amount}</p>
            </div>

            {/* Amount Keypad */}
            <div className="mb-4 grid grid-cols-3 gap-2">
              {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "delete"].map((key, i) => (
                <button
                  key={i}
                  onClick={() => key && handleKeyPress(key)}
                  className={`flex h-12 items-center justify-center rounded-xl text-lg font-medium ${
                    key === "" ? "" : "bg-muted text-foreground active:bg-muted/70"
                  }`}
                >
                  {key === "delete" ? "⌫" : key}
                </button>
              ))}
            </div>

            {/* Frequency */}
            <Drawer>
              <DrawerTrigger asChild>
                <button className="mb-4 flex w-full items-center justify-between rounded-2xl border border-border bg-background p-4">
                  <div className="text-left">
                    <p className="text-sm text-muted-foreground">Frequency</p>
                    <p className="font-medium text-foreground">
                      {repeat}{repeat === "Monthly" ? ` on the ${selectedDay}${selectedDay === 1 ? "st" : selectedDay === 2 ? "nd" : selectedDay === 3 ? "rd" : "th"}` : ""}
                    </p>
                  </div>
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                </button>
              </DrawerTrigger>
              <DrawerContent className="px-6 pb-8">
                <div className="mb-6 mt-4">
                  <h2 className="text-2xl font-bold text-foreground">Frequency</h2>
                </div>
                {repeatOptions.map((option) => (
                  <button
                    key={option}
                    onClick={() => setRepeat(option)}
                    className="flex w-full items-center justify-between border-b border-border py-4"
                  >
                    <span className="text-foreground">{option}</span>
                    {repeat === option && <Check className="h-5 w-5 text-foreground" />}
                  </button>
                ))}
              </DrawerContent>
            </Drawer>

            {/* Day selector for monthly */}
            {repeat === "Monthly" && (
              <div className="mb-4 rounded-2xl border border-border bg-background p-4">
                <p className="mb-4 text-sm text-muted-foreground">Day of month</p>
                <div className="grid grid-cols-7 gap-2">
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-colors ${
                        selectedDay === day
                          ? "bg-foreground text-background"
                          : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {hasActiveSubscription && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-foreground">£{activePayment?.amount.toFixed(2)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-background p-4">
              <p className="text-sm text-muted-foreground">Frequency</p>
              <p className="font-medium text-foreground capitalize">{activePayment?.frequency}</p>
            </div>
            {activePayment?.next_due_date && (
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-sm text-muted-foreground">Next payment</p>
                <p className="font-medium text-foreground">
                  {new Date(activePayment.next_due_date).toLocaleDateString("en-GB", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {hasActiveSubscription && (
        <div className="mt-auto px-6 pb-12">
          <Button
            variant="outline"
            className="w-full text-destructive hover:text-destructive"
            size="lg"
            onClick={handleCancel}
            disabled={isSaving}
          >
            {isSaving ? "Cancelling..." : "Cancel This Arrangement"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EditRecurringPayment;
