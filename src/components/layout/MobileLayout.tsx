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
      {/* The website's bottom tab bar is 5rem tall plus the safe area, so leave room for both. */}
      <main className={showNav ? (inApp ? "pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" : "pb-[calc(6rem+env(safe-area-inset-bottom))]") : ""}>
        {children}
      </main>
      {showNav && onTabChange && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );
};

export default MobileLayout;
