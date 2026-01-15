import { useState } from "react";
import { motion } from "framer-motion";
import MobileLayout from "@/components/layout/MobileLayout";
import MaintenanceTab from "@/components/dashboard/MaintenanceTab";
import ExpensesTab from "@/components/dashboard/ExpensesTab";
import BenefitsTab from "@/components/dashboard/BenefitsTab";
import ChatTab from "@/components/dashboard/ChatTab";
import ResourcesTab from "@/components/dashboard/ResourcesTab";

export type DashboardTab = "maintenance" | "expenses" | "benefits" | "chat" | "resources";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("maintenance");

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
