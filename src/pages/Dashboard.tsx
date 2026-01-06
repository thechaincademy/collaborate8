import { useState } from "react";
import { motion } from "framer-motion";
import { User, Bell, ArrowRight, Upload, Wallet, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import MobileLayout from "@/components/layout/MobileLayout";
import ActivityFilterSheet from "@/components/dashboard/ActivityFilterSheet";
import AboutEnvelopesSheet from "@/components/dashboard/AboutEnvelopesSheet";

const envelopes = [
  { name: "Charity", amount: 400.00, icon: "💝" },
  { name: "Moneybox", amount: 650.00, icon: "💰" },
  { name: "Savings", amount: 320.00, icon: "🏦" },
];

const transactions = [
  { name: "Recipient name", type: "Transfer type", amount: -300.00, date: "Today, 3 Aug" },
];

const Dashboard = () => {
  const navigate = useNavigate();
  const [activityFilter, setActivityFilter] = useState("all");
  return (
    <MobileLayout>
      <div className="px-6 pt-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex items-center justify-between"
        >
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <User className="h-5 w-5 text-foreground" />
          </button>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <Bell className="h-5 w-5 text-foreground" />
          </button>
        </motion.div>

        {/* Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <p className="mb-1 text-sm text-muted-foreground">Medi8 Balance</p>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            £ 1,546.00
          </h1>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 flex gap-3"
        >
          <Button className="flex-1" size="lg" onClick={() => navigate("/topup")}>
            <Upload className="mr-2 h-5 w-5 rotate-180" />
            Top-up
          </Button>
          <Button className="flex-1" size="lg" onClick={() => navigate("/send")}>
            Send
          </Button>
        </motion.div>

        {/* Envelopes Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 rounded-3xl bg-card p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Envelopes</h2>
            <AboutEnvelopesSheet>
              <button className="flex items-center gap-1 text-sm text-muted-foreground">
                <ArrowRight className="h-4 w-4" />
              </button>
            </AboutEnvelopesSheet>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {envelopes.map((envelope, index) => (
              <motion.button
                key={envelope.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                onClick={() => navigate(`/envelope/${envelope.name.toLowerCase()}`)}
                className="flex min-w-[140px] flex-col gap-2 rounded-2xl border border-border bg-background p-4 text-left"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-lg">
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="font-medium text-foreground">{envelope.name}</p>
                <p className="text-sm text-muted-foreground">
                  £ {envelope.amount.toFixed(2)}
                </p>
              </motion.button>
            ))}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.7 }}
              onClick={() => navigate("/envelope/new")}
              className="flex min-w-[140px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-background p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Plus className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">New</p>
            </motion.button>
          </div>
        </motion.div>

        {/* Activity Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <ActivityFilterSheet filter={activityFilter} onFilterChange={setActivityFilter}>
              <button className="flex items-center gap-2 text-lg font-semibold text-foreground">
                All Activity
                <ChevronDown className="h-5 w-5" />
              </button>
            </ActivityFilterSheet>
            <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-border">
              <Upload className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Transactions */}
          <div className="space-y-4">
            {transactions.map((tx, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + index * 0.1 }}
                onClick={() => navigate(`/transaction?type=${tx.amount < 0 ? 'sending' : 'receiving'}`)}
                className="w-full text-left"
              >
                <p className="mb-3 text-sm text-muted-foreground">{tx.date}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.name}</p>
                      <p className="text-sm text-muted-foreground">{tx.type}</p>
                    </div>
                  </div>
                  <p className="font-semibold text-foreground">
                    {tx.amount < 0 ? "–" : "+"} {Math.abs(tx.amount).toFixed(2)}
                  </p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </MobileLayout>
  );
};

export default Dashboard;
