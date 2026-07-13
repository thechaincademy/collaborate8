import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Download } from "lucide-react";
import { format, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Period = "3" | "6" | "12" | "all";
type StatementType = "maintenance" | "expenses";

interface Row {
  id: string;
  date: string;
  description: string;
  amount: number;
  status?: string;
}

const Statement = () => {
  const { type } = useParams<{ type: StatementType }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("3");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const isMaintenance = type === "maintenance";
  const title = isMaintenance ? "Monthly payments" : "Expenses";

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      if (isMaintenance) {
        const { data } = await supabase
          .from("payments")
          .select("id, created_at, amount, type, status")
          .order("created_at", { ascending: false });
        setRows(
          (data || []).map((p: any) => ({
            id: p.id,
            date: p.created_at,
            description: p.type === "recurring" ? "Recurring maintenance" : "Maintenance payment",
            amount: Number(p.amount),
            status: p.status,
          }))
        );
      } else {
        const { data } = await supabase
          .from("expense_requests")
          .select("id, created_at, description, amount, status")
          .order("created_at", { ascending: false });
        setRows(
          (data || []).map((e: any) => ({
            id: e.id,
            date: e.created_at,
            description: e.description,
            amount: Number(e.amount),
            status: e.status,
          }))
        );
      }
      setLoading(false);
    };
    load();
  }, [user, isMaintenance]);

  const filtered = useMemo(() => {
    if (period === "all") return rows;
    const cutoff = subMonths(new Date(), parseInt(period, 10));
    return rows.filter((r) => new Date(r.date) >= cutoff);
  }, [rows, period]);

  const total = filtered.reduce((sum, r) => sum + r.amount, 0);

  const downloadCsv = () => {
    const header = ["Date", "Description", "Amount", "Status"].join(",");
    const body = filtered
      .map((r) =>
        [
          format(new Date(r.date), "yyyy-MM-dd"),
          `"${r.description.replace(/"/g, '""')}"`,
          r.amount.toFixed(2),
          r.status ?? "",
        ].join(",")
      )
      .join("\n");
    const csv = `${header}\n${body}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-statement-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Helmet>
        <title>{title} statement - Collabor8</title>
      </Helmet>
      <div className="mx-auto min-h-screen max-w-md bg-background px-6 pb-24 pt-12">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-2xl font-bold text-foreground">{title} statement</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Activity summary for your co-parenting {isMaintenance ? "payments" : "expenses"}.
        </p>

        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/10 p-5">
          <p className="text-sm text-foreground/70">Total in period</p>
          <p className="mt-1 text-3xl font-bold text-foreground">£{total.toFixed(2)}</p>
          <p className="mt-1 text-xs text-foreground/60">{filtered.length} entries</p>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Past 3 months</SelectItem>
              <SelectItem value="6">Past 6 months</SelectItem>
              <SelectItem value="12">Past 12 months</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={downloadCsv} disabled={!filtered.length} variant="default">
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No activity in this period.
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(r.date), "d MMM yyyy")}
                    {r.status ? ` • ${r.status}` : ""}
                  </p>
                </div>
                <p className="ml-3 shrink-0 font-semibold text-foreground">£{r.amount.toFixed(2)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Statement;
