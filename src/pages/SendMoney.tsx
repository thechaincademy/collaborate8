import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDown, User, MessageSquare, Loader2, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/hooks/useProfile";
import { useBanking } from "@/hooks/useBanking";
import { usePayments } from "@/hooks/usePayments";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "amount" | "confirm" | "redirect" | "success";

const SendMoney = () => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { connection, fetchConnection } = useBanking();
  const { initiatePayment, loading: paymentLoading } = usePayments();

  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("0.00");
  const [comment, setComment] = useState("");
  const [coparentProfile, setCoparentProfile] = useState<any>(null);
  const [coparentBank, setCoparentBank] = useState<any>(null);

  useEffect(() => {
    fetchConnection();
    fetchCoparentDetails();
  }, [profile?.coparent_id]);

  const fetchCoparentDetails = async () => {
    if (!profile?.coparent_id) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profile.coparent_id)
      .single();
    if (data) setCoparentProfile(data);

    // Get co-parent's bank details (masked)
    const { data: bank } = await supabase
      .from("bank_connections")
      .select("institution_name, account_number_masked, account_id, sort_code")
      .eq("user_id", profile.coparent_id)
      .eq("consent_status", "active")
      .limit(1)
      .single();
    if (bank) setCoparentBank(bank);
  };

  const handleKeyPress = (digit: string) => {
    if (digit === "delete") {
      setAmount((prev) => {
        const newVal = prev.replace(".", "").slice(0, -1) || "0";
        return (parseInt(newVal, 10) / 100).toFixed(2);
      });
    } else {
      setAmount((prev) => {
        const current = prev.replace(".", "");
        const newVal = current + digit;
        const num = parseInt(newVal, 10);
        if (num > 9999999) return prev;
        return (num / 100).toFixed(2);
      });
    }
  };

  const handleSend = async () => {
    if (!connection) {
      toast.error("Please connect your bank account first");
      return;
    }
    if (!coparentProfile || !coparentBank) {
      toast.error("Co-parent has not connected their bank yet");
      return;
    }

    setStep("redirect");

    const result = await initiatePayment({
      institutionId: connection.institution_id,
      amount: parseFloat(amount),
      payeeName: [coparentProfile.first_name, coparentProfile.last_name].filter(Boolean).join(" ") || "Co-parent",
      payeeAccountNumber: coparentBank.account_id || "",
      payeeSortCode: coparentBank.sort_code || "",
      payeeId: profile?.coparent_id || "",
      type: "single",
      reference: comment || "Collabor8 Payment",
    });

    if (result?.authorisationUrl) {
      window.location.href = result.authorisationUrl;
    } else {
      setStep("success");
    }
  };

  const coparentName = coparentProfile
    ? [coparentProfile.first_name, coparentProfile.last_name].filter(Boolean).join(" ")
    : "Co-parent";

  if (step === "success") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center">
          <div className="flex h-32 w-32 items-center justify-center rounded-2xl bg-card">
            <Check className="h-16 w-16 text-foreground" />
          </div>
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="px-6 pb-12">
          <h1 className="mb-3 text-3xl font-bold text-foreground">Payment submitted!</h1>
          <p className="mb-8 text-muted-foreground">
            Your payment of £{amount} to {coparentName} has been initiated via Open Banking.
          </p>
          <Button className="w-full" size="lg" onClick={() => navigate("/dashboard")}>
            Done
          </Button>
        </motion.div>
      </div>
    );
  }

  if (step === "redirect") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Redirecting to your bank...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="px-6 pt-12">
        <button onClick={() => navigate(-1)} className="mb-8">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>

        {/* Recipient info */}
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">To: {coparentName}</p>
            <p className="text-sm text-muted-foreground">
              {coparentBank ? `${coparentBank.institution_name} ${coparentBank.account_number_masked}` : "Bank not connected"}
            </p>
          </div>
        </div>

        {/* From account */}
        <div className="mb-8 flex items-center gap-4 rounded-2xl bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Building2 className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold text-foreground">From: Your bank</p>
            <p className="text-sm text-muted-foreground">
              {connection ? `${connection.institution_name} ${connection.account_number_masked || ""}` : "Not connected"}
            </p>
          </div>
        </div>

        <div className="mb-8 text-center">
          <p className="text-4xl font-light text-foreground">£ {amount}</p>
        </div>
      </div>

      <div className="mt-auto px-6">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <Input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Add reference..."
            className="border-0 bg-transparent p-0 focus-visible:ring-0"
          />
        </div>

        <Button
          className="mb-6 w-full"
          size="lg"
          onClick={handleSend}
          disabled={parseFloat(amount) <= 0 || paymentLoading || !connection || !coparentBank}
        >
          {paymentLoading ? "Processing..." : "Send via Open Banking"}
        </Button>

        {!connection && (
          <p className="mb-4 text-center text-sm text-destructive">
            Connect your bank account in Profile to send payments
          </p>
        )}

        <div className="grid grid-cols-3 gap-2 pb-8">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "delete"].map((key, i) => (
            <button
              key={i}
              onClick={() => key && handleKeyPress(key)}
              className={`flex h-14 items-center justify-center rounded-xl text-xl font-medium ${
                key === "" ? "" : "bg-card text-foreground active:bg-muted"
              }`}
            >
              {key === "delete" ? "⌫" : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SendMoney;
