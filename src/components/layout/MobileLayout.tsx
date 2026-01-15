import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { DashboardTab } from "@/pages/Dashboard";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
}

const MobileLayout = ({ 
  children, 
  showNav = true, 
  activeTab = "maintenance",
  onTabChange 
}: MobileLayoutProps) => {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <main className={showNav ? "pb-24" : ""}>
        {children}
      </main>
      {showNav && onTabChange && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );
};

export default MobileLayout;
