import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import MobileLayout from "@/components/layout/MobileLayout";
import MaintenanceTab from "@/components/dashboard/MaintenanceTab";
import ExpensesTab from "@/components/dashboard/ExpensesTab";
import BenefitsTab from "@/components/dashboard/BenefitsTab";
import ChatTab from "@/components/dashboard/ChatTab";
import ResourcesTab from "@/components/dashboard/ResourcesTab";
import { useBanking } from "@/hooks/useBanking";
import { toast } from "sonner";

export type DashboardTab = "maintenance" | "expenses" | "benefits" | "chat" | "resources";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("maintenance");
  const [searchParams, setSearchParams] = useSearchParams();
  const { exchangeConsent } = useBanking();

  // Handle bank callback
  useEffect(() => {
    const isBankCallback = searchParams.get("bank-callback");
    const consent = searchParams.get("consent");
    const institutionId = searchParams.get("institution");

    if (isBankCallback && consent && institutionId) {
      exchangeConsent(consent, institutionId).then((result) => {
        if (result) {
          toast.success("Bank account linked successfully!");
        }
        // Clean up URL params
        setSearchParams({});
      });
    }
  }, [searchParams]);

  const renderContent = () => {
    switch (activeTab) {
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

  return (
    <MobileLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderContent()}
      </motion.div>
    </MobileLayout>
  );
};

export default Dashboard;
