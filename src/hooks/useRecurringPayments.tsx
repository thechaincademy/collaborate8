import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface RecurringPayment {
  id: string;
  user_id: string;
  amount: number;
  frequency: "daily" | "weekly" | "monthly";
  day_of_month: number | null;
  day_of_week: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  provider?: string;
  provider_subscription_id?: string | null;
  provider_price_id?: string | null;
  provider_customer_id?: string | null;
  next_due_date?: string | null;
  receiver_id?: string | null;
}

export const useRecurringPayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    if (!user) {
      setPayments([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("recurring_payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load payments");
      toast.error("Failed to load payments");
    } else {
      setPayments((data as RecurringPayment[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayments();
  }, [user]);

  const getActivePayment = () => {
    return payments.find((p) => p.is_active) || null;
  };

  const createOrUpdatePayment = async (
    amount: number,
    frequency: "daily" | "weekly" | "monthly",
    dayOfMonth?: number,
    dayOfWeek?: string
  ) => {
    if (!user) {
      toast.error("You must be logged in");
      return { error: new Error("Not authenticated") };
    }

    const activePayment = getActivePayment();

    if (activePayment) {
      // Update existing
      const { data, error } = await supabase
        .from("recurring_payments")
        .update({
          amount,
          frequency,
          day_of_month: dayOfMonth || null,
          day_of_week: dayOfWeek || null,
        })
        .eq("id", activePayment.id)
        .select()
        .single();

      if (error) {
        toast.error("Failed to update arrangement");
        return { error };
      }

      setPayments((prev) =>
        prev.map((p) => (p.id === activePayment.id ? (data as RecurringPayment) : p))
      );
      toast.success("Arrangement updated!");
      return { error: null, data };
    } else {
      // Create new
      const { data, error } = await supabase
        .from("recurring_payments")
        .insert({
          user_id: user.id,
          amount,
          frequency,
          day_of_month: dayOfMonth || null,
          day_of_week: dayOfWeek || null,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to create arrangement");
        return { error };
      }

      setPayments((prev) => [data as RecurringPayment, ...prev]);
      toast.success("Arrangement created!");
      return { error: null, data };
    }
  };

  const cancelPayment = async (paymentId: string) => {
    const { error } = await supabase
      .from("recurring_payments")
      .update({ is_active: false })
      .eq("id", paymentId);

    if (error) {
      toast.error("Failed to cancel arrangement");
      return { error };
    }

    setPayments((prev) =>
      prev.map((p) => (p.id === paymentId ? { ...p, is_active: false } : p))
    );
    toast.success("Arrangement cancelled");
    return { error: null };
  };

  return {
    payments,
    loading,
    getActivePayment,
    createOrUpdatePayment,
    cancelPayment,
    refetch: fetchPayments,
  };
};
