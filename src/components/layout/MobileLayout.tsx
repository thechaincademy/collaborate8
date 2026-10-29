import { ReactNode } from "react";
import BottomNav from "./BottomNav";
import { DashboardTab } from "@/pages/Dashboard";
import { useIsInApp } from "@/hooks/useIsInApp";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  activeTab?: DashboardTab;
  onTabChange?: (tab: DashboardTab) => void;
}

const MobileLayout = ({ 
  children, 
  showNav = true, 
  activeTab = "home",
  onTabChange 
}: MobileLayoutProps) => {
  const inApp = useIsInApp();
  return (
    <div className="mx-auto min-h-screen max-w-md md:max-w-3xl lg:max-w-5xl bg-background">
      <main className={showNav ? (inApp ? "pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" : "pb-24") : ""}>
        {children}
      </main>
      {showNav && onTabChange && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );
};

export default MobileLayout;
