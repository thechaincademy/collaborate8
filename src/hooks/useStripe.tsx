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
  const [cardsLoading, setCardsLoading] = useState(true);
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
    if (!user) {
      setCards([]);
      setCardsLoading(false);
      return;
    }

    setCardsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: { action: "list-cards" },
      });
      if (error) throw error;
      setCards(data?.cards ?? []);
    } catch {
      setCards([]);
    } finally {
      setCardsLoading(false);
    }
  }, [user]);

  /** Create a recurring subscription via hosted Checkout (Apple Pay / Google Pay / card) */
  const createSubscriptionCheckout = async (params: {
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
          action: "create-subscription-checkout",
          ...params,
        },
      });
      if (error) throw error;
      return data as { url: string; sessionId: string; priceId: string };
    } catch (e: any) {
      toast.error(e?.message || "Failed to start checkout");
      return null;
    } finally {
      setLoading(false);
    }
  };

  /** Create a recurring subscription (legacy: uses saved card off-session) */
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

  /** Recreate a subscription with transfer_data (fix missing transfers) */
  const recreateSubscription = async (arrangementId: string) => {
    if (!user) return null;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-subscriptions", {
        body: { action: "recreate-subscription", arrangementId },
      });
      if (error) throw error;
      toast.success("Subscription recreated with correct transfer setup!");
      return data;
    } catch (e: any) {
      toast.error(e?.message || "Failed to recreate subscription");
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    cardsLoading,
    cards,
    setupCard,
    fetchCards,
    createSubscription,
    cancelSubscription,
    getSubscriptionStatus,
    recreateSubscription,
  };
};
