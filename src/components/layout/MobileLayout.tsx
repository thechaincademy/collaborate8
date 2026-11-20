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
  // Website tab bar sits in the layout (not over the content). The main area scrolls above it.
  const websiteNav = Boolean(showNav && onTabChange && !inApp);
  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col overflow-hidden md:max-w-3xl lg:max-w-5xl">
        <main
          className={
            websiteNav
              ? "min-h-0 flex-1 overflow-y-auto"
              : showNav
                ? "min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
                : "min-h-0 flex-1 overflow-y-auto"
          }
        >
          {children}
        </main>
      </div>
      {showNav && onTabChange && (
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      )}
    </div>
  );
};

export default MobileLayout;
