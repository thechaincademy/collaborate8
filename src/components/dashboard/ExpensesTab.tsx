import { motion } from "framer-motion";
import { Shirt, Stethoscope, School, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import DashboardHeader from "./DashboardHeader";

const comingSoon = () => toast("Coming soon");

const ExpensesTab = () => {
  return (
    <div className="px-6 pt-12 pb-24">
      <DashboardHeader title="The Tab." />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-5"
      >
        <p className="text-base font-medium text-foreground">Log it. Split it. Done.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Log expenses and stay on the same page.
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">This month</p>
          <p className="text-2xl font-semibold text-foreground">£342</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Still to settle</p>
          <p className="text-2xl font-semibold text-foreground">£90</p>
        </div>
      </motion.div>

      {/* Waiting to settle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Waiting to settle
        </p>

        <div className="space-y-3">
          {/* Expense 1 - settle button */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Shirt className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Clothing</p>
                <p className="text-xs text-muted-foreground">9 May · Your share: £31.00</p>
              </div>
              <p className="font-medium text-foreground">£62.00</p>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Logged by Sarah</p>
              <Button size="sm" className="h-8 px-3 text-xs" onClick={comingSoon}>
                Settle £31.00
              </Button>
            </div>
          </div>

          {/* Expense 2 - waiting */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                <Stethoscope className="h-5 w-5 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">Dentist</p>
                <p className="text-xs text-muted-foreground">3 May · Your share: £59.00</p>
              </div>
              <p className="font-medium text-foreground">£118.00</p>
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/40 px-4 py-2.5">
              <p className="text-xs text-muted-foreground">Logged by you</p>
              <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                Waiting on Sarah
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Settled */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Settled
        </p>
        <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 opacity-60">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <School className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">School trip</p>
            <p className="text-xs text-muted-foreground">12 May · Split 50/50</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-foreground">£45.00</p>
            <p className="text-xs text-muted-foreground">Settled</p>
          </div>
        </div>
      </motion.div>

      {/* Add to the tab */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Button onClick={comingSoon} className="w-full gap-2" size="lg">
          <Plus className="h-5 w-5" />
          Add to the tab
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          You'll be able to attach a receipt when logging an expense.
        </p>
      </motion.div>
    </div>
  );
};

export default ExpensesTab;
