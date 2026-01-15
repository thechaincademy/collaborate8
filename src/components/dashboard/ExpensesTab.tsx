import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Plus, Receipt, Upload, Check, X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ExpenseView = "list" | "request" | "success";

const expenses = [
  { 
    name: "School uniform", 
    from: "Co-parent",
    amount: 85.00, 
    date: "15 Jan 2024",
    status: "pending"
  },
  { 
    name: "Medical appointment", 
    from: "You",
    amount: 45.00, 
    date: "10 Jan 2024",
    status: "paid"
  },
];

const ExpensesTab = () => {
  const [view, setView] = useState<ExpenseView>("list");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    setView("success");
  };

  const renderList = () => (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10 flex items-center justify-between"
      >
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <User className="h-5 w-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">Expenses</h1>
        <button className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
          <Bell className="h-5 w-5 text-foreground" />
        </button>
      </motion.div>

      {/* Request Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <Button 
          onClick={() => setView("request")} 
          className="w-full" 
          size="lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Request an Expense
        </Button>
      </motion.div>

      {/* Expenses List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="mb-4 text-lg font-semibold text-foreground">Recent Expenses</h3>
        
        <div className="space-y-3">
          {expenses.map((expense, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex items-center justify-between rounded-2xl bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <Receipt className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{expense.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {expense.from} • {expense.date}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-foreground">£{expense.amount.toFixed(2)}</p>
                <p className={`text-xs ${
                  expense.status === "paid" ? "text-muted-foreground" : "text-foreground"
                }`}>
                  {expense.status === "paid" ? "Paid" : "Pending"}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );

  const renderRequest = () => (
    <>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={() => setView("list")}
          className="mb-6 flex h-10 w-10 items-center justify-center"
        >
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="text-3xl font-bold text-foreground">Request an expense</h1>
        <p className="mt-2 text-muted-foreground">
          Enter the details and attach a receipt
        </p>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <Input
          placeholder="What's the expense for?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="h-14 rounded-2xl border-border bg-card text-foreground placeholder:text-muted-foreground"
        />

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
          <Input
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="h-14 rounded-2xl border-border bg-card pl-8 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Receipt Upload */}
        <button className="flex w-full items-center gap-4 rounded-2xl bg-card p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <div className="text-left">
            <p className="font-medium text-foreground">Attach receipt</p>
            <p className="text-sm text-muted-foreground">Take a photo or upload</p>
          </div>
        </button>
      </motion.div>

      <div className="flex-1" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-auto pt-6"
      >
        <Button 
          onClick={handleSubmit} 
          className="w-full" 
          size="lg"
          disabled={!amount || !description}
        >
          Send Request
        </Button>
      </motion.div>
    </>
  );

  const renderSuccess = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-1 flex-col items-center justify-center text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card">
        <Check className="h-10 w-10 text-foreground" />
      </div>
      
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Request sent!
      </h1>
      <p className="mb-8 text-muted-foreground">
        Your co-parent has been notified and can make the payment through the app.
      </p>

      <Button 
        onClick={() => {
          setView("list");
          setAmount("");
          setDescription("");
        }} 
        className="w-full" 
        size="lg"
      >
        Done
      </Button>
    </motion.div>
  );

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col px-6 pt-12">
      <AnimatePresence mode="wait">
        {view === "list" && renderList()}
        {view === "request" && renderRequest()}
        {view === "success" && renderSuccess()}
      </AnimatePresence>
    </div>
  );
};

export default ExpensesTab;
