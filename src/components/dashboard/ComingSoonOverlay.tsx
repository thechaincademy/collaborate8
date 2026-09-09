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
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-background/70 px-6 backdrop-blur-sm"
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
        <h2 className="mt-5 text-xl font-bold text-foreground">Coming soon</h2>
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
