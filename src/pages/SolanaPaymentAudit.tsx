import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import MobileLayout from "@/components/layout/MobileLayout";
import { supabase } from "@/integrations/supabase/client";
import { verifyPayment } from "@/hooks/useSolanaPayment";
import { explorerTxUrl } from "@/config/solana";

interface PaymentRecord {
  id: string;
  arrangement_id: string | null;
  period: string | null;
  payment_type: string;
  amount_usdc: number;
  amount_gbp_reference: number | null;
  tx_signature: string | null;
  network: string;
  status: string;
  created_at: string;
  confirmed_at: string | null;
  verified_at: string | null;
}

const statusStyles: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  confirmed: "bg-primary/15 text-primary",
  verified: "bg-emerald-500/15 text-emerald-600",
  failed: "bg-destructive/15 text-destructive",
};

/** Internal audit trail for USDC payments made over Solana. Not linked in navigation yet. */
const SolanaPaymentAudit = () => {
  const navigate = useNavigate();
  const { arrangementId } = useParams();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("payment_records")
      .select("*")
      .order("created_at", { ascending: false });
    if (arrangementId) query = query.eq("arrangement_id", arrangementId);
    const { data, error } = await query;
    if (error) toast.error("Could not load payment records");
    setRecords((data as PaymentRecord[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangementId]);

  const summary = useMemo(() => {
    const verified = records.filter((r) => r.status === "verified");
    const totalUsdc = records
      .filter((r) => r.status !== "failed")
      .reduce((sum, r) => sum + Number(r.amount_usdc), 0);
    const periods = new Set(records.map((r) => r.period).filter(Boolean) as string[]);
    return { verifiedCount: verified.length, totalUsdc, periodCount: periods.size };
  }, [records]);

  const handleReverify = async (id: string) => {
    setVerifyingId(id);
    try {
      const result = await verifyPayment(id);
      if (result?.verified) toast.success("Payment verified on Solana");
      else toast.error(`Verification failed: ${result?.failedCheck ?? "unknown check"}`);
      await load();
    } catch {
      toast.error("Could not verify this payment");
    } finally {
      setVerifyingId(null);
    }
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    let y = 18;
    doc.setFontSize(16);
    doc.text("Collabor8 - Payment audit report", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Generated ${format(new Date(), "d MMM yyyy HH:mm")}`, 14, y);
    y += 6;
    doc.text(
      `Total recorded: ${summary.totalUsdc.toFixed(2)} USDC | Verified payments: ${summary.verifiedCount}`,
      14,
      y
    );
    y += 10;

    records.forEach((r) => {
      if (y > 265) {
        doc.addPage();
        y = 18;
      }
      doc.setFontSize(11);
      doc.text(
        `${r.period ?? "-"} | ${r.payment_type} | ${Number(r.amount_usdc).toFixed(2)} USDC${
          r.amount_gbp_reference ? ` (ref GBP ${Number(r.amount_gbp_reference).toFixed(2)})` : ""
        } | ${r.status}`,
        14,
        y
      );
      y += 5;
      doc.setFontSize(8);
      doc.text(`Signature: ${r.tx_signature ?? "not submitted"}`, 14, y);
      y += 4;
      doc.text(
        `Date: ${format(new Date(r.created_at), "d MMM yyyy HH:mm")} | Network: ${r.network}`,
        14,
        y
      );
      y += 8;
    });

    if (y > 250) {
      doc.addPage();
      y = 18;
    }
    doc.setFontSize(9);
    doc.text(
      doc.splitTextToSize(
        "Each payment above settled on the Solana network in USDC. Anyone can check a transaction signature independently on Solana Explorer (explorer.solana.com) to confirm the amount, the wallets involved and the settlement date. Collabor8 never holds or moves funds: every payment is signed by the paying parent in their own wallet.",
        180
      ),
      14,
      y
    );

    doc.save("collabor8-payment-audit.pdf");
  };

  return (
    <MobileLayout>
      <div className="px-6 pt-12 pb-24">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Payment history</h1>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Total paid</p>
            <p className="text-lg font-semibold text-foreground">
              {summary.totalUsdc.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">USDC</p>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className="text-lg font-semibold text-foreground">{summary.verifiedCount}</p>
          </div>
          <div className="rounded-2xl bg-card p-4">
            <p className="text-xs text-muted-foreground">Periods</p>
            <p className="text-lg font-semibold text-foreground">{summary.periodCount}</p>
          </div>
        </div>

        <Button onClick={exportPdf} variant="outline" className="mb-6 w-full" disabled={!records.length}>
          <Download className="mr-2 h-4 w-4" /> Export audit report
        </Button>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))
          ) : records.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No payments recorded yet
            </p>
          ) : (
            records.map((r) => (
              <div key={r.id} className="rounded-2xl bg-card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-foreground">
                      {r.period ?? format(new Date(r.created_at), "MMM yyyy")}
                    </p>
                    <p className="text-xs capitalize text-muted-foreground">{r.payment_type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">
                      {Number(r.amount_usdc).toFixed(2)} USDC
                    </p>
                    {r.amount_gbp_reference != null && (
                      <p className="text-xs text-muted-foreground">
                        ref £{Number(r.amount_gbp_reference).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-medium capitalize ${
                      statusStyles[r.status] ?? statusStyles.pending
                    }`}
                  >
                    {r.status}
                  </span>
                  <div className="flex items-center gap-2">
                    {r.tx_signature && (
                      <a
                        href={explorerTxUrl(r.tx_signature, r.network as "devnet" | "mainnet-beta")}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs underline text-muted-foreground"
                      >
                        View on Explorer
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={verifyingId === r.id || !r.tx_signature}
                      onClick={() => handleReverify(r.id)}
                    >
                      <RefreshCw
                        className={`mr-1 h-3 w-3 ${verifyingId === r.id ? "animate-spin" : ""}`}
                      />
                      Re-verify
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </MobileLayout>
  );
};

export default SolanaPaymentAudit;
