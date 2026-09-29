import { Home, MessageCircle, PoundSterling, Receipt, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardTab } from "@/pages/Dashboard";

interface NavItem {
  icon: React.ElementType;
  label: string;
  tab: DashboardTab;
}

const navItems: NavItem[] = [
  { icon: Home, label: "Home", tab: "home" },
  { icon: PoundSterling, label: "Maintenance", tab: "maintenance" },
  { icon: Receipt, label: "Expenses", tab: "expenses" },
  { icon: MessageCircle, label: "Chat", tab: "chat" },
  { icon: Gift, label: "Benefits", tab: "benefits" },
];

interface BottomNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card pb-safe shadow-[0_-2px_12px_hsl(var(--foreground)/0.06)]">
      <div className="mx-auto flex h-20 max-w-md md:max-w-3xl lg:max-w-5xl items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;

          return (
            <button
              key={item.label}
              onClick={() => onTabChange(item.tab)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-xl py-2 transition-all duration-200 active:scale-95",
                isActive ? "text-primary" : "text-muted-foreground/70 hover:text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
              <span className="text-[11px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
