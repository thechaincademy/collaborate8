import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface ExpenseRequest {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  receipt_url: string | null;
  decided_by: string | null;
  decided_at: string | null;
  provider_invoice_item_id: string | null;
  applied_at: string | null;
  paid_at: string | null;
  apply_note: string | null;
  created_at: string;
  updated_at: string;
}

export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [deciding, setDeciding] = useState<string | null>(null);

  const fetchExpenses = async () => {
    if (!user) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("expense_requests")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load expenses");
    } else {
      setExpenses((data as unknown as ExpenseRequest[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [user]);

  const createExpense = async (
    description: string,
    amount: number,
    receiptFile?: File
  ) => {
    if (!user) {
      toast.error("You must be logged in");
      return { error: new Error("Not authenticated") };
    }

    let receiptUrl: string | null = null;

    // Upload receipt if provided
    if (receiptFile) {
      const fileExt = receiptFile.name.split(".").pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, receiptFile);

      if (uploadError) {
        toast.error("Failed to upload receipt");
        return { error: uploadError };
      }

      // Store the file path - we'll create signed URLs when needed
      receiptUrl = fileName;
    }

    const { data, error } = await supabase
      .from("expense_requests")
      .insert({
        user_id: user.id,
        description,
        amount,
        receipt_url: receiptUrl,
      })
      .select()
      .single();

    if (error) {
      toast.error("Failed to create expense");
      return { error };
    }

    setExpenses((prev) => [data as unknown as ExpenseRequest, ...prev]);
    toast.success("Expense sent to your co-parent for approval");
    return { error: null, data };
  };

  /** Approve or decline an expense raised by the co-parent. */
  const decideExpense = async (expenseId: string, decision: "approve" | "reject") => {
    setDeciding(expenseId);
    try {
      const { data, error } = await supabase.functions.invoke("expense-approvals", {
        body: { action: "decide", expenseId, decision },
      });

      if (error) {
        const ctx: any = (error as any).context;
        let serverMsg: string | undefined;
        try {
          if (ctx?.json) serverMsg = (await ctx.json())?.error;
          else if (ctx?.text) serverMsg = JSON.parse(await ctx.text())?.error;
        } catch {}
        throw new Error(serverMsg || error.message);
      }
      if (data?.error) throw new Error(data.error);

      if (decision === "approve") {
        toast.success(
          data?.appliedToNextPayment
            ? "Approved - added to the next recurring payment only"
            : data?.note || "Expense approved"
        );
      } else {
        toast.success("Expense declined");
      }

      await fetchExpenses();
      return { error: null };
    } catch (e: any) {
      toast.error(e?.message || "Could not update this expense");
      return { error: e as Error };
    } finally {
      setDeciding(null);
    }
  };

  /** Short-lived link so a receipt can be opened privately. */
  const getReceiptUrl = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("receipts")
      .createSignedUrl(path, 60 * 5);

    if (error || !data?.signedUrl) {
      toast.error("Could not open the receipt");
      return null;
    }
    return data.signedUrl;
  };

  return {
    expenses,
    loading,
    deciding,
    createExpense,
    decideExpense,
    getReceiptUrl,
    refetch: fetchExpenses,
  };
};
