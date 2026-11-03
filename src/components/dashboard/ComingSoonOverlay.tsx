import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Sparkles, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DashboardTab } from "@/pages/Dashboard";

interface ComingSoonOverlayProps {
  tab: DashboardTab;
  onBack?: () => void;
}

const labels: Record<DashboardTab, string> = {
  home: "Home",
  maintenance: "Maintenance",
  expenses: "Expenses",
  benefits: "Benefits",
  chat: "Chat",
  resources: "Resources",
};

const ComingSoonOverlay = ({ tab, onBack }: ComingSoonOverlayProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Not Radix based: move focus in, trap Tab, Escape goes back, restore focus.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = () =>
      Array.from(panel?.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])') ?? []);
    (focusables()[0] ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onBack) {
        e.preventDefault();
        onBack();
        return;
      }
      if (e.key !== "Tab" || !panel) return;
      const items = focusables();
      if (items.length === 0) { e.preventDefault(); panel.focus(); return; }
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === first || !panel.contains(document.activeElement))) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && (document.activeElement === last || !panel.contains(document.activeElement))) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [onBack]);

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="coming-soon-title"
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-40 focus:outline-none flex flex-col items-center justify-center bg-background/70 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.3 }}
        className="w-full max-w-sm rounded-3xl border border-border bg-card/95 p-8 text-center shadow-lg"
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="h-7 w-7" />
        </div>
        <h2 id="coming-soon-title" className="mt-5 text-xl font-bold text-foreground">Coming soon</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The <span className="font-semibold text-foreground">{labels[tab]}</span> area is
          still being built. We'll let you know as soon as it's ready.
        </p>
        {onBack && (
          <Button
            onClick={onBack}
            variant="outline"
            className="mt-6 w-full gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ComingSoonOverlay;
