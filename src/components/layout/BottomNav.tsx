import { PoundSterling, Receipt, Gift, MessageCircle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { DashboardTab } from "@/pages/Dashboard";

interface NavItem {
  icon: React.ElementType;
  label: string;
  tab: DashboardTab;
}

const navItems: NavItem[] = [
  { icon: PoundSterling, label: "Maintenance", tab: "maintenance" },
  { icon: Receipt, label: "Expenses", tab: "expenses" },
  { icon: Gift, label: "Benefits", tab: "benefits" },
  { icon: MessageCircle, label: "Chat", tab: "chat" },
  { icon: BookOpen, label: "Resources", tab: "resources" },
];

interface BottomNavProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
}

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex h-20 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.tab;

          return (
            <button
              key={item.label}
              onClick={() => onTabChange(item.tab)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
