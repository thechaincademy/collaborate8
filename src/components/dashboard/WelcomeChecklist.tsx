import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  userId?: string;
  invited: boolean;
  hasPayment: boolean;
  hasExpense: boolean;
}

const DONE_KEY = "c8_checklist_done";

/** Onboarding checklist - ticks itself off from real activity, hides once complete. */
const WelcomeChecklist = ({ userId, invited, hasPayment, hasExpense }: Props) => {
  const [hasMessage, setHasMessage] = useState<boolean | null>(null);
  const [alreadyDone] = useState(() => localStorage.getItem(DONE_KEY) === "1");
  const calcRun = typeof window !== "undefined" && localStorage.getItem("c8_calc_run") === "1";

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("sender_id", userId)
      .then(({ count }) => setHasMessage((count ?? 0) > 0));
  }, [userId]);

  const steps = [
    { label: "Invite your co-parent", done: invited },
    { label: "Run the child maintenance calculator", done: calcRun },
    { label: "Set up a maintenance payment", done: hasPayment },
    { label: "Log your first shared expense", done: hasExpense },
    { label: "Send your first message in the financial chat", done: !!hasMessage },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  const allDone = completed === steps.length;

  useEffect(() => {
    if (allDone) localStorage.setItem(DONE_KEY, "1");
  }, [allDone]);

  if (alreadyDone || hasMessage === null) return null;

  if (allDone) {
    return (
      <div className="mb-6 rounded-2xl bg-primary p-5 text-primary-foreground">
        <p className="font-semibold">You are all set. Your financial space is ready.</p>
      </div>
    );
  }

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="bg-primary px-5 py-3 text-primary-foreground">
        <p className="font-semibold">Get started with Collabor8</p>
      </div>
      <div className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
        </div>
        <ul className="space-y-3">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
                  s.done ? "border-primary bg-primary text-primary-foreground" : "border-border"
                }`}
              >
                {s.done && <Check className="h-3.5 w-3.5" />}
              </span>
              <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>{s.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WelcomeChecklist;
