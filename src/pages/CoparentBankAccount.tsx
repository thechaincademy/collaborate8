import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Banknote, Check, Loader2, Plus, Trash2, Bell, Info } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
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

type Frequency = "monthly" | "weekly";

interface BankAccount {
  id: string;
  holder_name: string;
  sort_code: string;
  account_number: string;
  payment_reference: string | null;
  amount: number | null;
  frequency: string;
  day_of_month: number | null;
  day_of_week: string | null;
  reminders_enabled: boolean;
}

interface ManualPayment {
  id: string;
  amount: number;
  paid_on: string;
  reference: string | null;
  note: string | null;
}

const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const formatSortCode = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  return digits.replace(/(\d{2})(?=\d)/g, "$1-");
};

const CoparentBankAccount = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [account, setAccount] = useState<BankAccount | null>(null);
  const [payments, setPayments] = useState<ManualPayment[]>([]);

  const [holderName, setHolderName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [reference, setReference] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [dayOfWeek, setDayOfWeek] = useState("monday");
  const [reminders, setReminders] = useState(true);

  const [logOpen, setLogOpen] = useState(false);
  const [logAmount, setLogAmount] = useState("");
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [logNote, setLogNote] = useState("");
  const [logging, setLogging] = useState(false);

  const load = async () => {
    if (!user) return;
    const [{ data: acc }, { data: logs }] = await Promise.all([
      supabase.from("coparent_bank_accounts").select("*").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("manual_payments")
        .select("id, amount, paid_on, reference, note")
        .eq("user_id", user.id)
        .order("paid_on", { ascending: false })
        .limit(30),
    ]);

    if (acc) {
      setAccount(acc as BankAccount);
      setHolderName(acc.holder_name ?? "");
      setSortCode(acc.sort_code ?? "");
      setAccountNumber(acc.account_number ?? "");
      setReference(acc.payment_reference ?? "");
      setAmount(acc.amount != null ? String(acc.amount) : "");
      setFrequency((acc.frequency as Frequency) === "weekly" ? "weekly" : "monthly");
      setDayOfMonth(acc.day_of_month != null ? String(acc.day_of_month) : "1");
      setDayOfWeek(acc.day_of_week ?? "monday");
      setReminders(acc.reminders_enabled ?? true);
    }
    setPayments((logs ?? []) as ManualPayment[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const sortCodeDigits = sortCode.replace(/\D/g, "");
  const canSave =
    holderName.trim().length > 1 &&
    sortCodeDigits.length === 6 &&
    accountNumber.replace(/\D/g, "").length === 8;

  const total = useMemo(
    () => payments.reduce((sum, p) => sum + Number(p.amount), 0),
    [payments]
  );

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      holder_name: holderName.trim(),
      sort_code: formatSortCode(sortCode),
      account_number: accountNumber.replace(/\D/g, ""),
      payment_reference: reference.trim() || null,
      amount: amount ? Number(amount) : null,
      frequency,
      day_of_month: frequency === "monthly" ? Number(dayOfMonth) || 1 : null,
      day_of_week: frequency === "weekly" ? dayOfWeek : null,
      reminders_enabled: reminders,
    };

    const { data, error } = await supabase
      .from("coparent_bank_accounts")
      .upsert(payload, { onConflict: "user_id" })
      .select()
      .maybeSingle();

    setSaving(false);
    if (error) {
      toast.error("Could not save these details");
      return;
    }
    setAccount(data as BankAccount);
    toast.success("Co-parent bank details saved");
  };

  const handleLogPayment = async () => {
    if (!user) return;
    const value = Number(logAmount);
    if (!value || value <= 0) {
      toast.error("Please enter the amount you paid");
      return;
    }
    setLogging(true);
    const { data, error } = await supabase
      .from("manual_payments")
      .insert({
        user_id: user.id,
        amount: value,
        paid_on: logDate,
        reference: reference.trim() || null,
        note: logNote.trim() || null,
      })
      .select("id, amount, paid_on, reference, note")
      .maybeSingle();
    setLogging(false);
    if (error) {
      toast.error("Could not record this payment");
      return;
    }
    setPayments((prev) => [data as ManualPayment, ...prev]);
    setLogAmount("");
    setLogNote("");
    setLogOpen(false);
    toast.success("Payment recorded");
  };

  const handleDeletePayment = async (id: string) => {
    const { error } = await supabase.from("manual_payments").delete().eq("id", id);
    if (error) {
      toast.error("Could not remove this record");
      return;
    }
    setPayments((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md md:max-w-2xl px-6 pb-28 pt-12">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-6 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Co-parent bank details</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            If you would rather not invite your co-parent to Collabor8, save their bank details here
            and keep your own record of every payment you make.
          </p>
        </motion.div>

        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            Collabor8 does not move this money. You send it from your own bank, and we remind you and
            keep the record so it appears in your statements.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 space-y-4 rounded-3xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Banknote className="h-5 w-5" />
                </div>
                <p className="font-semibold text-foreground">Where you send the money</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holder">Account holder name</Label>
                <Input
                  id="holder"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder="J Smith"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="sort">Sort code</Label>
                  <Input
                    id="sort"
                    inputMode="numeric"
                    value={sortCode}
                    onChange={(e) => setSortCode(formatSortCode(e.target.value))}
                    placeholder="20-00-00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accnum">Account number</Label>
                  <Input
                    id="accnum"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="12345678"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ref">Payment reference</Label>
                <Input
                  id="ref"
                  value={reference}
                  onChange={(e) => setReference(e.target.value.slice(0, 18))}
                  placeholder="Maintenance"
                />
                <p className="text-xs text-muted-foreground">
                  Use the same reference each time so payments are easy to trace.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount (optional)</Label>
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  placeholder="250.00"
                />
              </div>

              <div className="space-y-2">
                <Label>How often</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(["monthly", "weekly"] as Frequency[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFrequency(f)}
                      className={`rounded-xl border-2 p-3 text-sm font-medium capitalize transition-colors ${
                        frequency === f
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-background text-muted-foreground"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {frequency === "monthly" ? (
                <div className="space-y-2">
                  <Label htmlFor="dom">Day of the month</Label>
                  <Input
                    id="dom"
                    inputMode="numeric"
                    value={dayOfMonth}
                    onChange={(e) => {
                      const n = e.target.value.replace(/\D/g, "").slice(0, 2);
                      setDayOfMonth(n);
                    }}
                    placeholder="1"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Day of the week</Label>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDayOfWeek(d)}
                        className={`rounded-full border px-3 py-1.5 text-xs capitalize transition-colors ${
                          dayOfWeek === d
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start gap-3">
                  <Bell className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Payment reminders</p>
                    <p className="text-xs text-muted-foreground">
                      We email you on the day the payment is due.
                    </p>
                  </div>
                </div>
                <Switch checked={reminders} onCheckedChange={setReminders} />
              </div>

              <Button onClick={handleSave} disabled={!canSave || saving} className="w-full gap-2" size="lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {account ? "Save changes" : "Save bank details"}
              </Button>
            </motion.div>

            {/* Records */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">Your payment record</h2>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setLogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Record
                </Button>
              </div>

              {payments.length === 0 ? (
                <p className="rounded-2xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-sm text-muted-foreground">
                    Total recorded: <span className="font-semibold text-foreground">£{total.toFixed(2)}</span>
                  </p>
                  <div className="space-y-3">
                    {payments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                      >
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">£{Number(p.amount).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(p.paid_on), "d MMM yyyy")}
                            {p.note ? ` - ${p.note}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeletePayment(p.id)}
                          aria-label="Remove record"
                          className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </div>

      <Dialog open={logOpen} onOpenChange={setLogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Record a payment</DialogTitle>
            <DialogDescription>
              Add a payment you have already sent from your own bank.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="log-amount">Amount</Label>
              <Input
                id="log-amount"
                inputMode="decimal"
                value={logAmount}
                onChange={(e) => setLogAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder={amount || "250.00"}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-date">Date paid</Label>
              <Input
                id="log-date"
                type="date"
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="log-note">Note (optional)</Label>
              <Input
                id="log-note"
                value={logNote}
                onChange={(e) => setLogNote(e.target.value.slice(0, 80))}
                placeholder="September maintenance"
              />
            </div>
            <Button onClick={handleLogPayment} disabled={logging} className="w-full gap-2">
              {logging ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save record
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CoparentBankAccount;
