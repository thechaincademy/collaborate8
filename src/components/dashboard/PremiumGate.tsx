import { useState } from "react";
import { ConversationToolModal, useConversationToolAccess } from "./ConversationToolPromo";
import { isPremiumRequired } from "@/lib/premium";

/** Recheck server entitlement before protected work; never infer it from local payment state. */
export const usePremiumGate = () => {
  const { hasAccess, loading, refresh } = useConversationToolAccess();
  const [paywallOpen, setPaywallOpen] = useState(false);
  const requireAccess = async () => {
    const allowed = await refresh();
    if (!allowed) setPaywallOpen(true);
    return allowed;
  };
  const handleDenied = async (data: unknown, error: unknown, storage = false) => {
    if (await isPremiumRequired(data, error)) {
      setPaywallOpen(true);
      return true;
    }
    // Storage RLS returns 403, not the edge function's 402 JSON contract.
    if (storage && error && !(await refresh())) {
      setPaywallOpen(true);
      return true;
    }
    return false;
  };
  return { hasAccess, loading, requireAccess, handleDenied, paywallOpen, setPaywallOpen };
};

export const PremiumPaywall = ({ open, onOpenChange }: {
  open: boolean; onOpenChange: (open: boolean) => void;
}) => <ConversationToolModal open={open} onOpenChange={onOpenChange} premiumOnly />;