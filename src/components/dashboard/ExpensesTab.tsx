import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Receipt, Upload, Check, ArrowLeft, Image, X,
  CheckCircle, XCircle, Clock, AlertCircle, Send
} from "lucide-react";
import DashboardHeader from "./DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useExpenses, ExpenseRequest } from "@/hooks/useExpenses";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type ExpenseView = "list" | "request" | "success";

const statusConfig = {
  pending: { icon: Clock, label: "Pending", className: "text-amber-500" },
  approved: { icon: CheckCircle, label: "Approved", className: "text-emerald-500" },
  paid: { icon: Check, label: "Paid", className: "text-muted-foreground" },
  rejected: { icon: XCircle, label: "Rejected", className: "text-destructive" },
};

// ─── Managing Parent View ───────────────────────────────────────
const ManagingParentExpenses = () => {
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [coparentExpenses, setCoparentExpenses] = useState<any[]>([]);
  const [ownExpenses, setOwnExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllExpenses = async () => {
    setLoading(true);
    // Fetch co-parent's expense requests (incoming)
    if (profile?.coparent_id) {
      const { data } = await supabase
        .from("expense_requests")
        .select("*")
        .eq("user_id", profile.coparent_id)
        .order("created_at", { ascending: false });
      if (data) setCoparentExpenses(data);
    }
    // Fetch own history (outgoing payments for expenses)
    const { data: own } = await supabase
      .from("expense_requests")
      .select("*")
      .eq("user_id", profile?.id || "")
      .order("created_at", { ascending: false });
    if (own) setOwnExpenses(own);
    setLoading(false);
  };

  useEffect(() => {
    if (profile) fetchAllExpenses();
  }, [profile?.id, profile?.coparent_id]);

  const handleUpdateStatus = async (expenseId: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("expense_requests")
      .update({ status })
      .eq("id", expenseId);
    if (error) {
      toast.error("Failed to update expense");
    } else {
      toast.success(`Expense ${status}`);
      fetchAllExpenses();
    }
  };

  const pendingRequests = coparentExpenses.filter((e) => e.status === "pending");
  const processedRequests = coparentExpenses.filter((e) => e.status !== "pending");

  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col px-6 pt-12">
      <DashboardHeader title="Expenses" />

      {/* Pending Requests Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          Pending Requests
          {pendingRequests.length > 0 && (
            <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-500">
              {pendingRequests.length}
            </span>
          )}
        </h3>

        {loading ? (
          <div className="py-6 text-center text-muted-foreground">Loading...</div>
        ) : pendingRequests.length === 0 ? (
          <div className="mb-6 rounded-2xl bg-card p-6 text-center">
            <Check className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">All caught up! No pending requests.</p>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            {pendingRequests.map((expense, index) => (
              <motion.div
                key={expense.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
                className="rounded-2xl bg-card p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                      {expense.receipt_url ? (
                        <Image className="h-5 w-5 text-amber-500" />
                      ) : (
                        <Receipt className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        From co-parent • {format(new Date(expense.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-semibold text-foreground">£{expense.amount.toFixed(2)}</p>
                </div>

                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => handleUpdateStatus(expense.id, "approved")}
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={() => handleUpdateStatus(expense.id, "rejected")}
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Approved - Ready to Pay */}
      {coparentExpenses.filter((e) => e.status === "approved").length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
            <Send className="h-5 w-5 text-emerald-500" />
            Ready to Pay
          </h3>
          <div className="mb-6 space-y-3">
            {coparentExpenses
              .filter((e) => e.status === "approved")
              .map((expense) => (
                <div key={expense.id} className="rounded-2xl bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(expense.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-foreground">£{expense.amount.toFixed(2)}</p>
                  </div>
                  <Button
                    size="sm"
                    className="mt-3 w-full gap-1"
                    onClick={() => navigate("/send-money")}
                  >
                    <Send className="h-4 w-4" /> Send Payment
                  </Button>
                </div>
              ))}
          </div>
        </motion.div>
      )}

      {/* History */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h3 className="mb-3 text-lg font-semibold text-foreground">History</h3>
        {processedRequests.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted-foreground">No previous expense requests</div>
        ) : (
          <div className="space-y-3 pb-6">
            {processedRequests.map((expense) => {
              const config = statusConfig[expense.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div key={expense.id} className="flex items-center justify-between rounded-2xl bg-card p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <StatusIcon className={`h-5 w-5 ${config.className}`} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{expense.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(expense.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">£{expense.amount.toFixed(2)}</p>
                    <p className={`text-xs ${config.className}`}>{config.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Viewing Parent (Child) View ────────────────────────────────
const ViewingParentExpenses = () => {
  const { user } = useAuth();
  const { expenses, loading, createExpense } = useExpenses();
  const [view, setView] = useState<ExpenseView>("list");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setReceiptPreview(ev.target?.result as string);
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

  const resetForm = () => {
    setView("list");
    setAmount("");
    setDescription("");
    setReceiptFile(null);
    setReceiptPreview(null);
  };

  if (view === "success") {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col px-6 pt-12">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-1 flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-card">
            <Check className="h-10 w-10 text-foreground" />
          </div>
          <h1 className="mb-2 text-3xl font-bold text-foreground">Request sent!</h1>
          <p className="mb-8 text-muted-foreground">Your co-parent has been notified and can review the expense.</p>
          <Button onClick={resetForm} className="w-full" size="lg">Done</Button>
        </motion.div>
      </div>
    );
  }

  if (view === "request") {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] flex-col px-6 pt-12">
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
      </div>
    );
  }

  // List view
  return (
    <div className="flex min-h-[calc(100vh-6rem)] flex-col px-6 pt-12">
      <DashboardHeader title="Expenses" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
        <Button onClick={() => setView("request")} className="w-full" size="lg" disabled={!user}>
          <Plus className="mr-2 h-5 w-5" />
          Request an Expense
        </Button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 className="mb-4 text-lg font-semibold text-foreground">Your Requests</h3>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : expenses.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No expenses yet. Submit your first request!</div>
        ) : (
          <div className="space-y-3 pb-6">
            {expenses.map((expense, index) => {
              const config = statusConfig[expense.status as keyof typeof statusConfig] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <motion.div
                  key={expense.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between rounded-2xl bg-card p-4"
                >
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
                        {format(new Date(expense.created_at), "dd MMM yyyy")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">£{expense.amount.toFixed(2)}</p>
                    <div className={`flex items-center gap-1 text-xs ${config.className}`}>
                      <StatusIcon className="h-3 w-3" />
                      {config.label}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ─── Main Router ────────────────────────────────────────────────
const ExpensesTab = () => {
  const { isManaging, loading } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return isManaging ? <ManagingParentExpenses /> : <ViewingParentExpenses />;
};

export default ExpensesTab;
