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

export const ONBOARDING_STEPS: Array<{
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

export const readTutorialState = (userId: string): Saved => {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { index: 0, done: false };
};

export const writeTutorialState = (userId: string, state: Saved) => {
  localStorage.setItem(keyFor(userId), JSON.stringify(state));
};

const load = readTutorialState;

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

  if (!state || state.done || state.index >= ONBOARDING_STEPS.length) return null;

  const step = ONBOARDING_STEPS[state.index];
  const isLast = state.index === ONBOARDING_STEPS.length - 1;
  const next = (i: number) =>
    setState(i >= ONBOARDING_STEPS.length ? { index: i, done: true } : { index: i, done: false });

  const handleSetup = () => {
    const doing = state.index;
    next(doing + 1);
    if (step.route) navigate(step.route);
    else if (step.tab) {
      onNavigate(step.tab);
      setOpen(doing + 1 >= ONBOARDING_STEPS.length);
    }
  };

  const skipAll = () => setState({ index: ONBOARDING_STEPS.length, done: true });

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="card"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex flex-col bg-background"
          role="dialog"
          aria-label="Getting started tutorial"
        >
          <motion.div
            key={state.index}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mx-auto flex w-full max-w-md flex-1 flex-col overflow-y-auto px-5 py-6"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Step {state.index + 1} of {ONBOARDING_STEPS.length}
              </span>
              <button
                onClick={skipAll}
                className="text-[11px] text-muted-foreground/70 underline-offset-2 hover:underline"
              >
                Skip tutorial
              </button>
            </div>
            <div className="mb-10 flex gap-1.5">
              {ONBOARDING_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full ${i <= state.index ? "bg-primary" : "bg-muted"}`}
                />
              ))}
            </div>
            <div className="flex flex-1 flex-col justify-center pb-6">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <step.icon className="h-8 w-8" />
              </div>
              <h2 className="mb-3 text-2xl font-bold text-foreground">{step.title}</h2>
              <p className="mb-10 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              <div className="space-y-3">
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
          Done? Next step ({state.index + 1} of {ONBOARDING_STEPS.length})
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default OnboardingTutorial;
