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
  created_at: string;
  updated_at: string;
}

export const useExpenses = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseRequest[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error("Error fetching expenses:", error);
      toast.error("Failed to load expenses");
    } else {
      setExpenses((data as ExpenseRequest[]) || []);
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

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("receipts")
        .upload(fileName, receiptFile);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        toast.error("Failed to upload receipt");
        return { error: uploadError };
      }

      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);

      receiptUrl = urlData.publicUrl;
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
      console.error("Error creating expense:", error);
      toast.error("Failed to create expense");
      return { error };
    }

    setExpenses((prev) => [data as ExpenseRequest, ...prev]);
    toast.success("Expense request sent!");
    return { error: null, data };
  };

  return { expenses, loading, createExpense, refetch: fetchExpenses };
};
