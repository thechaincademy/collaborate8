import { motion } from "framer-motion";
import { Receipt, Construction } from "lucide-react";
import DashboardHeader from "./DashboardHeader";

const ExpensesTab = () => {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col px-6 pt-12">
      <DashboardHeader title="Expenses" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-1 flex-col items-center justify-center text-center"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Construction className="h-10 w-10 text-muted-foreground" />
        </div>
        <div className="mb-2 inline-flex items-center gap-2">
          <Receipt className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-2xl font-bold text-foreground">Expense Sharing</h2>
        </div>
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          Coming Soon
        </span>
        <p className="max-w-xs text-muted-foreground">
          Split child-related expenses with your co-parent. Submit receipts, track approvals, and stay on top of shared costs.
        </p>
      </motion.div>
    </div>
  );
};

export default ExpensesTab;
