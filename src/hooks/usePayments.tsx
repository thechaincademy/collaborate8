import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { DisplayProfile } from "@/lib/profileDisplay";

export interface Payment {
  id: string;
  idempotency_key: string;
  payer_id: string | null;
  payee_id: string | null;
  payer?: DisplayProfile | null;
  payee?: DisplayProfile | null;
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
      .select("*, payer:profiles!payments_payer_id_fkey(first_name,last_name), payee:profiles!payments_payee_id_fkey(first_name,last_name)")
      .order("created_at", { ascending: false });
    if (data) setPayments(data as Payment[]);
    setLoading(false);
  };

  return {
    payments,
    loading,
    fetchPayments,
  };
};
