import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Receipt, Upload, Check, ArrowLeft, Image, X, CheckCircle, XCircle } from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses } from "@/hooks/useExpenses";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ExpenseView = "list" | "request" | "success";

const ExpensesTab = () => {
  const { user } = useAuth();
  const { expenses, loading, createExpense, refetch } = useExpenses();
  const { isManaging, isViewing, profile } = useProfile();
  const [view, setView] = useState<ExpenseView>("list");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [coparentExpenses, setCoparentExpenses] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch co-parent's expenses
  useEffect(() => {
    const fetchCoparentExpenses = async () => {
      if (!profile?.coparent_id) return;
      const { data } = await supabase
        .from("expense_requests")
        .select("*")
        .eq("user_id", profile.coparent_id)
        .order("created_at", { ascending: false });
      if (data) setCoparentExpenses(data);
    };
    fetchCoparentExpenses();
  }, [profile?.coparent_id]);

  const allExpenses = [
    ...expenses.map((e) => ({ ...e, isOwn: true })),
    ...coparentExpenses.map((e: any) => ({ ...e, isOwn: false })),
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    setReceiptPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!amount || !description) return;
    setIsSubmitting(true);
    const { error } = await createExpense(description, parseFloat(amount), receiptFile || undefined);
    setIsSubmitting(false);
    if (!error) setView("success");
  };

  const handleUpdateExpenseStatus = async (expenseId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("expense_requests")
      .update({ status })
      .eq("id", expenseId);
    if (error) {
      toast.error("Failed to update expense");
    } else {
      toast.success(`Expense ${status}`);
      // Refresh co-parent expenses
      if (profile?.coparent_id) {
        const { data } = await supabase
          .from("expense_requests")
          .select("*")
          .eq("user_id", profile.coparent_id)
          .order("created_at", { ascending: false });
        if (data) setCoparentExpenses(data);
      }
    }
  };

  const resetForm = () => {
    setView("list");
    setAmount("");
    setDescription("");
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  const renderList = () => (
    <>
      <DashboardHeader title="Expenses" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
        <Button onClick={() => setView("request")} className="w-full" size="lg" disabled={!user}>
          <Plus className="mr-2 h-5 w-5" />
          Request an Expense
        </Button>
        {!user && (
          <p className="mt-2 text-center text-sm text-muted-foreground">Please log in to request expenses</p>
        )}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="mb-4 text-lg font-semibold text-foreground">All Expenses</h3>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : allExpenses.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No expenses yet.</div>
        ) : (
          <div className="space-y-3">
            {allExpenses.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
                className="rounded-2xl bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {expense.receipt_url ? (
                        <Image className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Receipt className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {expense.isOwn ? "You" : "Co-parent"} • {format(new Date(expense.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">£{expense.amount.toFixed(2)}</p>
                    <p className={`text-xs capitalize ${expense.status === "paid" ? "text-muted-foreground" : "text-foreground"}`}>
                      {expense.status}
                    </p>
                  </div>
                </div>

                {/* Action buttons for managing parent on co-parent's pending expenses */}
                {isManaging && !expense.isOwn && expense.status === "pending" && (
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => handleUpdateExpenseStatus(expense.id, "approved")}
                    >
                      <CheckCircle className="h-4 w-4" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1"
                      onClick={() => handleUpdateExpenseStatus(expense.id, "rejected")}
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </>
  );

  const renderRequest = () => (
    <>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <button onClick={() => setView("list")} className="mb-6 flex h-10 w-10 items-center justify-center">
          <ArrowLeft className="h-6 w-6 text-foreground" />
        </button>
        <h1 className="text-3xl font-bold text-foreground">Request an expense</h1>
        <p className="mt-2 text-muted-foreground">Enter the details and attach a receipt</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-4">
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

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />

        {receiptPreview ? (
          <div className="relative rounded-2xl bg-card p-4">
            <button onClick={handleRemoveReceipt} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80">
              <X className="h-4 w-4 text-foreground" />
            </button>
            <img src={receiptPreview} alt="Receipt preview" className="max-h-48 w-full rounded-xl object-contain" />
            <p className="mt-2 text-center text-sm text-muted-foreground">{receiptFile?.name}</p>
          </div>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} className="flex w-full items-center gap-4 rounded-2xl bg-card p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <Upload className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">Attach receipt</p>
              <p className="text-sm text-muted-foreground">Take a photo or upload</p>
            </div>
          </button>
        )}
      </motion.div>

      <div className="flex-1" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-auto pt-6">
        <Button onClick={handleSubmit} className="w-full" size="lg" disabled={!amount || !description || isSubmitting}>
          {isSubmitting ? "Sending..." : "Send Request"}
        </Button>
      </motion.div>
    </>
  );

  const renderSuccess = () => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card">
        <Check className="h-10 w-10 text-foreground" />
      </div>
      <h1 className="mb-2 text-3xl font-bold text-foreground">Request sent!</h1>
      <p className="mb-8 text-muted-foreground">Your co-parent has been notified and can make the payment through the app.</p>
      <Button onClick={resetForm} className="w-full" size="lg">Done</Button>
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
