import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ExpenseRequest } from "@/hooks/useExpenses";

interface Props {
  userId?: string;
  payments: Array<{ payer_id?: string; status?: string }>;
  expenses: ExpenseRequest[];
}

const DAY = 86400000;

/** Private score for this parent only - never shown to the co-parent. */
const HealthScore = ({ userId, payments, expenses }: Props) => {
  const [msgRate, setMsgRate] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("messages")
      .select("sender_id, recipient_id, created_at")
      .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data }) => {
        const rows = data ?? [];
        let due = 0;
        let answered = 0;
        rows.forEach((m, i) => {
          if (m.recipient_id !== userId) return;
          const t = +new Date(m.created_at);
          const reply = rows.slice(i + 1).find((r) => r.sender_id === userId);
          const replied = reply && +new Date(reply.created_at) - t <= 7 * DAY;
          if (replied) { due++; answered++; }
          else if (Date.now() - t > 7 * DAY) due++;
        });
        setMsgRate(due ? answered / due : null);
      });
  }, [userId]);

  const mine = payments.filter((p) => p.payer_id === userId && p.status && p.status !== "pending" && p.status !== "processing");
  const payRate = mine.length
    ? mine.filter((p) => ["succeeded", "completed", "paid"].includes(p.status!)).length / mine.length
    : null;
  const decided = expenses.filter((e) => ["approved", "paid", "agreed", "rejected"].includes(e.status));
  const expRate = decided.length ? decided.filter((e) => e.status !== "rejected").length / decided.length : null;

  if (msgRate === undefined) return null;
  const factors = [payRate, expRate, msgRate].filter((f): f is number => f !== null);
  if (!factors.length) return null;

  const score = Math.round((factors.reduce((a, b) => a + b, 0) / factors.length) * 100);
  const label =
    score >= 80 ? "Your arrangement is working well." : score >= 50 ? "Your arrangement is progressing." : "Your arrangement may need attention.";
  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div className="mb-6 flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">Financial health - only you can see this</p>
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" className="stroke-muted" />
          <circle cx="50" cy="50" r={r} fill="none" strokeWidth="8" strokeLinecap="round" className="stroke-primary"
            strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-foreground">{score}%</span>
      </div>
      <p className="mt-3 text-sm font-medium text-foreground">{label}</p>
    </div>
  );
};

export default HealthScore;
