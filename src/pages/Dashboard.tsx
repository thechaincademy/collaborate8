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

const COMING_SOON_TABS: DashboardTab[] = ["benefits"];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [searchParams, setSearchParams] = useSearchParams();
  const { syncCheckoutSession } = useStripePayments();

  useEffect(() => {
    const checkoutResult = searchParams.get("subscription-checkout");
    const sessionId = searchParams.get("session_id");
    if (checkoutResult === "success") {
      const finalize = async () => {
        if (sessionId) {
          await syncCheckoutSession(sessionId);
        }
        toast.success("Recurring payment set up successfully!");
        setActiveTab("maintenance");
        searchParams.delete("subscription-checkout");
        searchParams.delete("session_id");
        setSearchParams(searchParams, { replace: true });
      };
      finalize();
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    trackTab(activeTab);
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
        return <ChatTab />;
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
