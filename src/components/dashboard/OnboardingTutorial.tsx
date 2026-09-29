import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Calculator, PoundSterling, Receipt, MessageCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardTab } from "@/pages/Dashboard";
import { useAuth } from "@/hooks/useAuth";

// Progress is stored per account, so every new account gets the tutorial
const keyFor = (userId: string) => `c8_tutorial_v1_${userId}`;

type Saved = { index: number; done: boolean };

const steps: Array<{
  title: string;
  body: string;
  cta: string;
  icon: React.ElementType;
  route?: string;
  tab?: DashboardTab;
}> = [
  {
    title: "Work out your child maintenance",
    body: "Start with the Calculator to see how much child maintenance is likely to be paid, using the UK standard formula.",
    cta: "Open the calculator",
    icon: Calculator,
    route: "/app/child-maintenance-calculator",
  },
  {
    title: "Set up your financial space",
    body: "In Maintenance, set up how you pay or receive. You don't need to invite your co-parent if they are the one receiving - their bank details are enough. Adding their email is best, so they get invited, receive updates about other financial matters and can use the chat with you.",
    cta: "Set up maintenance",
    icon: PoundSterling,
    tab: "maintenance",
  },
  {
    title: "Add your expenses",
    body: "From Expenses, add any shared costs with a receipt and send them to your co-parent for approval.",
    cta: "Add an expense",
    icon: Receipt,
    tab: "expenses",
  },
  {
    title: "Use the Financial Chat",
    body: "Discuss expenses and maintenance in one dedicated space. The Self-Guided Financial Conversation Tool lets both parents answer questions privately, and a shared summary shows where you agree and where further conversation is needed.",
    cta: "Open the chat",
    icon: MessageCircle,
    tab: "chat",
  },
];

const load = (userId: string): Saved => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { index: 0, done: false };
};

interface Props {
  activeTab: DashboardTab;
  onNavigate: (tab: DashboardTab) => void;
}

const OnboardingTutorial = ({ activeTab, onNavigate }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;
  const [state, setState] = useState<Saved | null>(null);
  // "open" = showing the step card; false while the user is doing a step
  const [open, setOpen] = useState(true);

  // Load this account's progress once we know who is signed in
  useEffect(() => {
    if (userId) setState(load(userId));
  }, [userId]);

  useEffect(() => {
    if (userId && state) localStorage.setItem(keyFor(userId), JSON.stringify(state));
  }, [userId, state]);

  // Coming back to Home after doing a step shows the next one
  useEffect(() => {
    if (activeTab === "home") setOpen(true);
  }, [activeTab]);

  if (state.done || state.index >= steps.length) return null;

  const step = steps[state.index];
  const isLast = state.index === steps.length - 1;
  const next = (i: number) =>
    setState(i >= steps.length ? { index: i, done: true } : { index: i, done: false });

  const handleSetup = () => {
    const doing = state.index;
    next(doing + 1);
    if (step.route) navigate(step.route);
    else if (step.tab) {
      onNavigate(step.tab);
      setOpen(doing + 1 >= steps.length);
    }
  };

  const skipAll = () => setState({ index: steps.length, done: true });

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
        >
          <motion.div
            key={state.index}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl"
            role="dialog"
            aria-label="Getting started tutorial"
          >
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Step {state.index + 1} of {steps.length}
              </span>
              <button
                onClick={skipAll}
                className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline"
              >
                Skip tutorial
              </button>
            </div>
            <div className="mb-4 flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= state.index ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <step.icon className="h-6 w-6" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-foreground">{step.title}</h2>
            <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            <div className="space-y-2">
              <Button size="lg" className="w-full gap-2" onClick={handleSetup}>
                {step.cta}
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => next(state.index + 1)}
              >
                {isLast ? "Skip and finish" : "Skip this step"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.button
          key="pill"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-24 left-1/2 z-[55] flex -translate-x-1/2 items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg"
        >
          Done? Next step ({state.index + 1} of {steps.length})
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTutorial;
