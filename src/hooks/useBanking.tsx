import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface BankConnection {
  id: string;
  user_id: string;
  institution_id: string;
  institution_name: string;
  consent_status: string;
  account_id: string | null;
  account_type: string | null;
  account_name: string | null;
  sort_code: string | null;
  account_number_masked: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
}

export const useBanking = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [connection, setConnection] = useState<BankConnection | null>(null);

  const fetchConnection = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("bank_connections")
      .select("*")
      .eq("user_id", user.id)
      .eq("consent_status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (data) setConnection(data as BankConnection);
  };

  const getInstitutions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("yapily-banking", {
        body: { action: "get-institutions" },
      });
      if (error) throw error;
      return data.institutions || [];
    } catch (e: any) {
      toast.error("Failed to load banks");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const linkBank = async (institutionId: string, callbackUrl?: string) => {
    if (!user) {
      toast.error("Please log in first");
      return null;
    }
    setLoading(true);
    try {
      const finalCallbackUrl = callbackUrl || `${window.location.origin}/dashboard?bank-callback=true&institution=${institutionId}`;
      const { data, error } = await supabase.functions.invoke("yapily-banking", {
        body: {
          action: "create-authorisation",
          institutionId,
          callbackUrl: finalCallbackUrl,
        },
      });
      if (error) throw error;
      return data;
    } catch (e: any) {
      toast.error("Failed to start bank connection");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const exchangeConsent = async (consentToken: string, institutionId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("yapily-banking", {
        body: {
          action: "exchange-consent",
          consentToken,
          institutionId,
        },
      });
      if (error) throw error;
      await fetchConnection();
      toast.success("Bank account linked successfully!");
      return data;
    } catch (e: any) {
      toast.error("Failed to link bank account");
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getAccounts = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("yapily-banking", {
        body: { action: "get-accounts" },
      });
      if (error) throw error;
      return data.accounts || [];
    } catch {
      return [];
    }
  };

  return {
    loading,
    connection,
    fetchConnection,
    getInstitutions,
    linkBank,
    exchangeConsent,
    getAccounts,
  };
};
