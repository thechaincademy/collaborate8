import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import MobileLayout from "@/components/layout/MobileLayout";
import HomeTab from "@/components/dashboard/HomeTab";
import MaintenanceTab from "@/components/dashboard/MaintenanceTab";
import ExpensesTab from "@/components/dashboard/ExpensesTab";
import BenefitsTab from "@/components/dashboard/BenefitsTab";
import ChatTab from "@/components/dashboard/ChatTab";
import ResourcesTab from "@/components/dashboard/ResourcesTab";
import ComingSoonOverlay from "@/components/dashboard/ComingSoonOverlay";
import { useStripePayments } from "@/hooks/useStripe";
import { trackTab } from "@/lib/analytics";

export type DashboardTab = "home" | "maintenance" | "expenses" | "benefits" | "chat" | "resources";

const VALID_TABS: DashboardTab[] = ["home", "maintenance", "expenses", "benefits", "chat", "resources"];
const COMING_SOON_TABS: DashboardTab[] = ["benefits"];

const Dashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  // URL is the single source of truth for the active tab.
  const rawTab = searchParams.get("tab");
  const isValidRaw = rawTab === "documents" || (rawTab !== null && (VALID_TABS as string[]).includes(rawTab));
  const activeTab: DashboardTab =
    rawTab === "documents" ? "chat" : isValidRaw ? (rawTab as DashboardTab) : "home";

  // User tab clicks push a history entry, only when the tab actually changes.
  const setActiveTab = (tab: DashboardTab) => {
    if (tab === activeTab && rawTab !== "documents") return;
    if (tab === "chat" && rawTab === "documents") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (tab === "home") next.delete("tab");
      else next.set("tab", tab);
      return next;
    });
  };
  const { syncCheckoutSession } = useStripePayments();

  useEffect(() => {
    const checkoutResult = searchParams.get("subscription-checkout");
    const sessionId = searchParams.get("session_id");
    if (checkoutResult === "success") {
      const finalize = async () => {
        if (sessionId) {
          const result = await syncCheckoutSession(sessionId);
          if (!result?.success) {
            toast.error("Your arrangement could not be confirmed. Please try again.");
            return;
          }
          window.dispatchEvent(new Event("c8-arrangement-refresh"));
        } else {
          return;
        }
        toast.success("Recurring payment set up successfully!");
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev);
          next.delete("subscription-checkout");
          next.delete("session_id");
          next.set("tab", "maintenance");
          return next;
        }, { replace: true });
      };
      finalize();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!searchParams.has("card-setup") || searchParams.get("tab") !== "maintenance") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("card-setup");
      return next;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Normalise invalid or redundant ?tab= values with replace (only for invalid values).
  useEffect(() => {
    if (rawTab === null || isValidRaw && rawTab !== "home") return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete("tab");
      return next;
    }, { replace: true });
  }, [rawTab, isValidRaw, setSearchParams]);

  useEffect(() => {
    trackTab(activeTab);
    if (activeTab === "chat") localStorage.setItem("c8_chat_opened", "1");
    if (activeTab === "maintenance") localStorage.setItem("c8_maintenance_opened", "1");
  }, [activeTab]);

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab onNavigate={setActiveTab} />;
      case "maintenance":
        return <MaintenanceTab />;
      case "expenses":
        return <ExpensesTab />;
      case "benefits":
        return <BenefitsTab />;
      case "chat":
        return <ChatTab key={rawTab ?? "chat"} initialSection={rawTab === "documents" ? "documents" : "chat"} />;
      case "resources":
        return <ResourcesTab />;
    }
  };

  const isComingSoon = COMING_SOON_TABS.includes(activeTab);

  return (
    <>
      <Helmet>
        <title>Dashboard - Collabor8</title>
        <meta name="description" content="Your Collabor8 dashboard. Track child maintenance payments, shared expenses, and manage co-parenting finances in one place." />
        <link rel="canonical" href="https://collaborate8.com/dashboard" />
      </Helmet>
      <MobileLayout activeTab={activeTab} onTabChange={setActiveTab}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="relative"
        >
          {renderContent()}
          <AnimatePresence>
            {isComingSoon && (
              <ComingSoonOverlay tab={activeTab} onBack={() => setActiveTab("home")} />
            )}
          </AnimatePresence>
        </motion.div>
      </MobileLayout>
    </>
  );
};

export default Dashboard;
