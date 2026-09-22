import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  Clock,
  FileText,
  Paperclip,
  Plus,
  Receipt,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import DashboardHeader from "./DashboardHeader";
import { useExpenses, type ExpenseRequest } from "@/hooks/useExpenses";
import { useProfile } from "@/hooks/useProfile";
import { toast } from "sonner";

const statusLabel = (e: ExpenseRequest) => {
  switch (e.status) {
    case "approved":
      return e.applied_at ? "Approved - on next payment" : "Approved";
    case "paid":
      return "Paid";
    case "rejected":
      return "Declined";
    default:
      return "Awaiting approval";
  }
};

const statusClass = (status: ExpenseRequest["status"]) => {
  switch (status) {
    case "approved":
      return "text-primary";
    case "paid":
      return "text-emerald-600";
    case "rejected":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
};

const ExpensesTab = () => {
  const { profile, loading: profileLoading } = useProfile();
  const {
    expenses,
    loading,
    deciding,
    createExpense,
    decideExpense,
    getReceiptUrl,
  } = useExpenses();

  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isLoading = loading || profileLoading;
  const hasCoparent = Boolean(profile?.coparent_id);

  const mine = expenses.filter((e) => e.user_id === profile?.id);
  const theirs = expenses.filter((e) => e.user_id !== profile?.id);
  const toReview = theirs.filter((e) => e.status === "pending");

  const nextPaymentTotal = expenses
    .filter((e) => e.status === "approved" && e.applied_at)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const submit = async () => {
    const value = Number(amount);
    if (!description.trim()) return toast.error("Add a short description");
    if (!value || value <= 0) return toast.error("Add an amount");

    setSaving(true);
    const { error } = await createExpense(description.trim(), value, receipt ?? undefined);
    setSaving(false);
    if (!error) {
      setDescription("");
      setAmount("");
      setReceipt(null);
      setShowForm(false);
    }
  };

  const openReceipt = async (path: string) => {
    const url = await getReceiptUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderCard = (e: ExpenseRequest, canDecide: boolean) => (
    <div key={e.id} className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground">{e.description}</p>
          <p className="text-xs text-muted-foreground">
            {format(new Date(e.created_at), "d MMM yyyy")}
          </p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-foreground">£{Number(e.amount).toFixed(2)}</p>
          <p className={`text-xs ${statusClass(e.status)}`}>{statusLabel(e)}</p>
        </div>
      </div>

      {e.receipt_url && (
        <button
          onClick={() => openReceipt(e.receipt_url!)}
          className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline"
        >
          <FileText className="h-3.5 w-3.5" />
          View receipt
        </button>
      )}

      {e.apply_note && e.status !== "pending" && (
        <p className="mt-2 text-xs text-muted-foreground">{e.apply_note}</p>
      )}

      {canDecide && e.status === "pending" && (
        <div className="mt-4 flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={deciding === e.id}
            onClick={() => decideExpense(e.id, "approve")}
          >
            <Check className="mr-1 h-4 w-4" />
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            disabled={deciding === e.id}
            onClick={() => decideExpense(e.id, "reject")}
          >
            <X className="mr-1 h-4 w-4" />
            Decline
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="px-6 pt-12 pb-24">
      <DashboardHeader title="Expenses" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-6 rounded-2xl border border-border bg-card p-5"
      >
        <p className="text-base font-medium text-foreground">Shared expenses</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Add a one-off cost with a receipt. Your co-parent approves or declines it. Anything approved
          is added to the next recurring payment only, then the payment goes back to its usual amount.
        </p>
      </motion.div>

      {/* Next payment summary */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 grid grid-cols-2 gap-3"
      >
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">On next payment</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">£{nextPaymentTotal.toFixed(2)}</p>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-1 text-xs text-muted-foreground">Waiting on you</p>
          {isLoading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-semibold text-foreground">{toReview.length}</p>
          )}
        </div>
      </motion.div>

      {/* Add expense */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="mb-6"
      >
        {!hasCoparent && !isLoading ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-5 text-sm text-muted-foreground">
            Link your co-parent first. Expenses need both parents so one can approve what the other adds.
          </div>
        ) : !showForm ? (
          <Button className="w-full" onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add an expense
          </Button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                What was it for?
              </label>
              <Textarea
                value={description}
                onChange={(ev) => setDescription(ev.target.value)}
                placeholder="School trip, winter coat, dentist..."
                maxLength={200}
                rows={2}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Amount (£)</label>
              <Input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(ev) => setReceipt(ev.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary"
              >
                <Paperclip className="h-4 w-4" />
                {receipt ? receipt.name : "Attach a receipt (optional)"}
              </button>
            </div>
            <div className="flex gap-2 pt-1">
              <Button className="flex-1" disabled={saving} onClick={submit}>
                {saving ? "Sending..." : "Send for approval"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                disabled={saving}
                onClick={() => {
                  setShowForm(false);
                  setReceipt(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Waiting on you */}
      {toReview.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mb-6"
        >
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Waiting for your approval
          </p>
          <div className="space-y-3">{toReview.map((e) => renderCard(e, true))}</div>
        </motion.div>
      )}

      {/* All expenses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          All expenses
        </p>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Receipt className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No expenses yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add a one-off cost and your co-parent will be asked to approve it.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...mine, ...theirs.filter((e) => e.status !== "pending")]
              .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
              .map((e) => renderCard(e, false))}
          </div>
        )}
      </motion.div>

      {!isLoading && expenses.some((e) => e.status === "pending" && e.user_id === profile?.id) && (
        <p className="mt-6 flex items-start gap-2 text-xs text-muted-foreground">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your co-parent will see anything you send here and can approve or decline it.
        </p>
      )}
    </div>
  );
};

export default ExpensesTab;
