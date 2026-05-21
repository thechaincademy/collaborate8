import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import MobileLayout from "@/components/layout/MobileLayout";
import HomeTab from "@/components/dashboard/HomeTab";
import MaintenanceTab from "@/components/dashboard/MaintenanceTab";
import ExpensesTab from "@/components/dashboard/ExpensesTab";
import BenefitsTab from "@/components/dashboard/BenefitsTab";
import ChatTab from "@/components/dashboard/ChatTab";
import ResourcesTab from "@/components/dashboard/ResourcesTab";

export type DashboardTab = "home" | "maintenance" | "expenses" | "benefits" | "chat" | "resources";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [searchParams] = useSearchParams();

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
        >
          {renderContent()}
        </motion.div>
      </MobileLayout>
    </>
  );
};

export default Dashboard;
