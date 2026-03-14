import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export interface CardInfo {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
}

export interface ConnectedAccountStatus {
  status: string; // not_created | pending | complete
  payoutsEnabled?: boolean;
  chargesEnabled?: boolean;
  accountId?: string;
}

export interface SubscriptionInfo {
  subscriptionId: string;
  status: string;
  currentPeriodEnd: string;
  nextPaymentDate: string;
}

export const useStripeConnect = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  /** Start Stripe Connect onboarding for receiver */
  const startOnboarding = async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "create-account" },
      });
      if (error) throw error;
      return data as { url: string; accountId: string };
    } catch (e: any) {
      toast.error("Failed to start onboarding");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Check Connect account status */
  const checkAccountStatus = async (): Promise<ConnectedAccountStatus | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect", {
        body: { action: "check-status" },
      });
      if (error) throw error;
      return data as ConnectedAccountStatus;
    } catch {
      return null;
    }
  };

  return { loading, startOnboarding, checkAccountStatus };
};

export const useStripePayments = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<CardInfo[]>([]);

  /** Redirect to Stripe Checkout to add a card */
  const setupCard = async () => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: { action: "setup-card" },
      });
      if (error) throw error;
      return data as { url: string; customerId: string };
    } catch (e: any) {
      toast.error("Failed to start card setup");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** List saved cards */
  const fetchCards = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: { action: "list-cards" },
      });
      if (error) throw error;
      if (data?.cards) setCards(data.cards);
    } catch {
      // silent
    }
  }, [user]);

  /** Create a recurring subscription */
  const createSubscription = async (params: {
    amount: number;
    currency?: string;
    interval?: string;
    receiverId: string;
  }) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: {
          action: "create-subscription",
          ...params,
        },
      });
      if (error) throw error;
      toast.success("Recurring payment created!");
      return data;
    } catch (e: any) {
      toast.error(e?.message || "Failed to create subscription");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Cancel a subscription */
  const cancelSubscription = async (subscriptionId: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: { action: "cancel-subscription", subscriptionId },
      });
      if (error) throw error;
      toast.success("Subscription cancelled");
      return data;
    } catch {
      toast.error("Failed to cancel subscription");
    } finally {
      setLoading(false);
    }
  };

  /** Get subscription status */
  const getSubscriptionStatus = async (subscriptionId: string): Promise<SubscriptionInfo | null> => {
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: { action: "get-status", subscriptionId },
      });
      if (error) throw error;
      return data as SubscriptionInfo;
    } catch {
      return null;
    }
  };

  return {
    loading,
    cards,
    setupCard,
    fetchCards,
    createSubscription,
    cancelSubscription,
    getSubscriptionStatus,
  };
};
