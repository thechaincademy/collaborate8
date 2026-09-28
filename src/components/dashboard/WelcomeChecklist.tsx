import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Props {
  userId?: string;
  invited: boolean;
}

const DONE_KEY = "c8_checklist_v2_done";

/** Onboarding checklist - steps unlock in order and tick off from real activity. */
const WelcomeChecklist = ({ invited }: Props) => {
  const [alreadyDone] = useState(() => localStorage.getItem(DONE_KEY) === "1");
  const chatOpened = localStorage.getItem("c8_chat_opened") === "1";
  const maintenanceOpened = localStorage.getItem("c8_maintenance_opened") === "1";

  const s1 = invited;
  const s2 = s1 && chatOpened;
  const s3 = s2 && maintenanceOpened;
  const steps = [
    { title: "Add your co-parent", desc: "Invite your co-parent to join Collabor8 and connect your accounts.", done: s1, unlocked: true },
    { title: "Explore the financial chat", desc: "Your dedicated space to discuss finances with your co-parent, away from everything else.", done: s2, unlocked: s1 },
    { title: "Explore child maintenance", desc: "Use the calculator to understand what maintenance should look like for your family.", done: s3, unlocked: s2 },
    { title: "Your profile is complete", desc: "You are all set. Your financial space is ready.", done: s3, unlocked: s3 },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);
  const allDone = s3;

  useEffect(() => {
    if (allDone) localStorage.setItem(DONE_KEY, "1");
  }, [allDone]);

  if (alreadyDone) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="bg-primary px-5 py-3 text-primary-foreground">
        <p className="font-semibold">Get started with Collabor8</p>
      </div>
      <div className="p-5">
        {allDone && (
          <div className="mb-4 rounded-xl bg-primary p-4 text-primary-foreground">
            <p className="font-semibold">Welcome to Collabor8. Your financial space is ready.</p>
          </div>
        )}
        <div className="mb-4 flex items-center gap-3">
          <Progress value={pct} className="h-2 flex-1" />
          <span className="text-xs font-medium text-muted-foreground">{pct}%</span>
        </div>
        <ul className="space-y-4">
          {steps.map((s, i) => (
            <li key={s.title} className={`flex items-start gap-3 ${s.unlocked ? "" : "opacity-40"}`}>
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {i + 1}
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                  s.done ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <Check className="h-3.5 w-3.5" />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default WelcomeChecklist;
