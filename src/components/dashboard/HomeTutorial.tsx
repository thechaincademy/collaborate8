import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardTab } from "@/pages/Dashboard";

const CHAT_KEY = "c8_chat_opened";
const MAINTENANCE_KEY = "c8_maintenance_opened";

const steps: Array<{
  title: string;
  description: string;
  action: string | null;
  target?: DashboardTab;
}> = [
  {
    title: "Add your co-parent",
    description: "Invite your co-parent to join Collabor8 and connect your accounts.",
    action: "Add your co-parent",
  },
  {
    title: "Explore the financial chat",
    description: "Your dedicated space to discuss finances with your co-parent, away from everything else.",
    action: "Go to financial chat",
    target: "chat",
  },
  {
    title: "Explore child maintenance",
    description: "Find out how child maintenance works and what your options are.",
    action: "Go to child maintenance",
    target: "maintenance",
  },
  {
    title: "Your space is ready",
    description: "You are all set. Everything you need to manage finances and child maintenance is here.",
    action: null,
  },
];

interface Props {
  userId?: string;
  isLinked: boolean;
  coparentId: string | null;
  inviteEmail: string | null;
  onInvite: () => void;
  onNavigate: (tab: DashboardTab) => void;
}

const readFlag = (key: string) => {
  try {
    return localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
};

const HomeTutorial = ({ userId, isLinked, coparentId, inviteEmail, onInvite, onNavigate }: Props) => {
  const [chatOpened, setChatOpened] = useState(false);
  const [maintenanceOpened, setMaintenanceOpened] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [coparentName, setCoparentName] = useState("");

  useEffect(() => {
    const sync = () => {
      setChatOpened(readFlag(CHAT_KEY));
      setMaintenanceOpened(readFlag(MAINTENANCE_KEY));
    };
    sync();
    window.addEventListener("focus", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    try {
      setExpanded(localStorage.getItem(`c8-home-tutorial-expanded-${userId}`) === "1");
    } catch {
      /* Tutorial state is a convenience only - never blocks the app. */
    }
  }, [userId]);

  useEffect(() => {
    if (!isLinked || !coparentId) return;
    supabase
      .from("profiles")
      .select("first_name")
      .eq("id", coparentId)
      .maybeSingle()
      .then(({ data }) => setCoparentName(data?.first_name?.trim() ?? ""));
  }, [isLinked, coparentId]);

  const step1 = isLinked || !!inviteEmail;
  const step2 = step1 && chatOpened;
  const step3 = step2 && maintenanceOpened;
  const step4 = step3;
  const done = [step1, step2, step3, step4];
  const completed = done.filter(Boolean).length;
  const percent = Math.round((completed / steps.length) * 100);
  const allDone = completed === steps.length;

  const coparentLabel = coparentName || inviteEmail || "your co-parent";
  const doneDescription = `Done. ${coparentLabel} has been invited.`;

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    try {
      if (userId) localStorage.setItem(`c8-home-tutorial-expanded-${userId}`, next ? "1" : "0");
    } catch {
      /* Ignored - the banner still works without saving. */
    }
  };

  if (allDone && !expanded) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={toggleExpanded}
        aria-label="Your space is ready. Show the tutorial."
        className="mb-4 flex w-full items-center gap-2 rounded-lg bg-teal px-3 py-2 text-left text-[13px] font-semibold text-teal-foreground shadow-sm"
      >
        <Check className="h-4 w-4 shrink-0 text-gold" strokeWidth={3} />
        Your space is ready.
      </motion.button>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      aria-label="Getting started"
      className="mb-4 overflow-hidden rounded-xl border border-teal/25 bg-card shadow-sm"
    >
      <div className="h-1 w-full bg-muted" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-teal transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-teal">{percent}% complete</p>
          {allDone && (
            <button onClick={toggleExpanded} className="text-[10px] font-medium text-muted-foreground hover:underline">
              Hide
            </button>
          )}
        </div>
        <ol className="space-y-2.5">
          {steps.map((step, index) => {
            const unlocked = index === 0 || done[index - 1];
            const isDone = done[index];
            return (
              <li key={step.title} aria-disabled={!unlocked} className={cn("flex gap-2.5", !unlocked && "opacity-45")}>
                <span
                  className={cn(
                    "mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                    isDone ? "bg-gold text-gold-foreground" : unlocked ? "bg-teal text-teal-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className={cn("text-[13px] font-bold leading-tight", unlocked ? "text-navy" : "text-muted-foreground")}>
                      {step.title}
                    </h3>
                    {isDone && <Check aria-label={`${step.title} completed`} className="h-3.5 w-3.5 shrink-0 text-gold" strokeWidth={3} />}
                  </div>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {isDone && index === 0 ? doneDescription : step.description}
                  </p>
                  {unlocked && !isDone && step.action && (
                    <Button
                      size="sm"
                      onClick={() => (step.target ? onNavigate(step.target) : onInvite())}
                      className="mt-1.5 h-6 bg-teal px-2.5 text-[11px] text-teal-foreground hover:bg-teal/90"
                    >
                      {step.action}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        {step4 && (
          <div className="mt-2.5 rounded-md border border-teal/25 bg-teal/10 px-2.5 py-1.5 text-xs font-semibold text-teal">
            Your space is ready. Welcome to Collabor8.
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default HomeTutorial;
