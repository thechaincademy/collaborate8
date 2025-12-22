import { ReactNode } from "react";
import BottomNav from "./BottomNav";

interface MobileLayoutProps {
  children: ReactNode;
  showNav?: boolean;
}

const MobileLayout = ({ children, showNav = true }: MobileLayoutProps) => {
  return (
    <div className="mx-auto min-h-screen max-w-md bg-background">
      <main className={showNav ? "pb-24" : ""}>
        {children}
      </main>
      {showNav && <BottomNav />}
    </div>
  );
};

export default MobileLayout;
