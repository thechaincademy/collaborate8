import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface Payment {
  id: string;
  idempotency_key: string;
  payer_id: string;
  payee_id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  provider_payment_id: string | null;
  error_message: string | null;
  related_expense_id: string | null;
  related_arrangement_id: string | null;
  created_at: string;
  updated_at: string;
}

export const usePayments = () => {
  const { user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setPayments(data as Payment[]);
    setLoading(false);
  };

  const initiatePayment = async (params: {
    institutionId: string;
    amount: number;
    payeeName: string;
    payeeAccountNumber: string;
    payeeSortCode: string;
    payeeId: string;
    type?: string;
    reference?: string;
    relatedExpenseId?: string;
    relatedArrangementId?: string;
  }) => {
    if (!user) {
      toast.error("Please log in first");
      return null;
    }

    setLoading(true);
    const idempotencyKey = crypto.randomUUID();
    const callbackUrl = `${window.location.origin}/dashboard?payment-callback=true`;

    try {
      const { data, error } = await supabase.functions.invoke("yapily-payments", {
        body: {
          action: "create-payment-auth",
          idempotencyKey,
          callbackUrl,
          ...params,
        },
      });
      if (error) throw error;
      return { ...data, idempotencyKey };
    } catch (e: any) {
      toast.error("Failed to initiate payment");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const executePayment = async (consentToken: string, idempotencyKey: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("yapily-payments", {
        body: {
          action: "execute-payment",
          consentToken,
          idempotencyKey,
        },
      });
      if (error) throw error;
      toast.success("Payment submitted!");
      await fetchPayments();
      return data;
    } catch (e: any) {
      toast.error("Payment failed");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentStatus = async (paymentId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("yapily-payments", {
        body: { action: "get-status", paymentId },
      });
      if (error) throw error;
      return data;
    } catch {
      return null;
    }
  };

  return {
    payments,
    loading,
    fetchPayments,
    initiatePayment,
    executePayment,
    checkPaymentStatus,
  };
};
