import { motion } from "framer-motion";
import { Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import DashboardHeader from "./DashboardHeader";

const transactions = [
  { 
    name: "Monthly maintenance", 
    status: "completed", 
    amount: 320.00, 
    date: "1 Jan 2024",
    type: "outgoing"
  },
  { 
    name: "Monthly maintenance", 
    status: "pending", 
    amount: 320.00, 
    date: "1 Feb 2024",
    type: "outgoing"
  },
];

const MaintenanceTab = () => {
  const navigate = useNavigate();

  return (
    <div className="px-6 pt-12">
      {/* Header */}
      <DashboardHeader title="Child Maintenance" />

      {/* Balance Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 rounded-3xl bg-card p-6"
      >
        <p className="mb-1 text-sm text-muted-foreground">Next payment</p>
        <h2 className="mb-4 text-4xl font-bold text-foreground">£320.00</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Due 1st February 2024</span>
        </div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8 grid grid-cols-2 gap-3"
      >
        <Button className="h-auto flex-col gap-2 py-4" variant="outline">
          <span className="font-medium">Payment History</span>
        </Button>
        <Button 
          className="h-auto flex-col gap-2 py-4" 
          variant="outline"
          onClick={() => navigate("/edit-payment")}
        >
          <span className="font-medium">Edit Arrangement</span>
        </Button>
      </motion.div>

      {/* Payment History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Payments</h3>
        
        <div className="space-y-3">
          {transactions.map((tx, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  tx.status === "completed" ? "bg-muted" : "bg-muted"
                }`}>
                  {tx.status === "completed" ? (
                    <Check className="h-5 w-5 text-foreground" />
                  ) : (
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-foreground">{tx.name}</p>
                  <p className="text-sm text-muted-foreground">{tx.date}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">
                  {tx.type === "outgoing" ? "-" : "+"}£{tx.amount.toFixed(2)}
                </p>
                <p className={`text-xs ${
                  tx.status === "completed" ? "text-muted-foreground" : "text-muted-foreground"
                }`}>
                  {tx.status === "completed" ? "Completed" : "Pending"}
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default MaintenanceTab;
