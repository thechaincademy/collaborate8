import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Banknote, Check, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

  const [holderName, setHolderName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  const load = async () => {
    if (!user) return;
    const { data: acc } = await supabase
      .from("coparent_bank_accounts")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (acc) {
      setAccount(acc as BankAccount);
      setHolderName(acc.holder_name ?? "");
      setSortCode(acc.sort_code ?? "");
      setAccountNumber(acc.account_number ?? "");
    }
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

  const handleSave = async () => {
    if (!user || !canSave) return;
    setSaving(true);
    const payload = {
      user_id: user.id,
      holder_name: holderName.trim(),
      sort_code: formatSortCode(sortCode),
      account_number: accountNumber.replace(/\D/g, ""),
      payment_reference: null,
      amount: null,
      frequency: "monthly",
      day_of_month: null,
      day_of_week: null,
      reminders_enabled: false,
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
            Collabor8 does not move this money. You send it from your own bank, and we keep the
            record so it appears in your statements.
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 rounded-3xl border border-border bg-card p-5"
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

            <Button onClick={handleSave} disabled={!canSave || saving} className="w-full gap-2" size="lg">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {account ? "Save changes" : "Save bank details"}
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default CoparentBankAccount;
