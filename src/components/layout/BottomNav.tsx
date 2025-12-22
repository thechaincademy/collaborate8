import { useLocation, useNavigate } from "react-router-dom";
import { Home, Layers, Star } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Layers, label: "Tools", path: "/tools", center: true },
  { icon: Star, label: "Rewards", path: "/rewards" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card pb-safe">
      <div className="mx-auto flex h-20 max-w-md items-center justify-around px-6">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          
          if (item.center) {
            return (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-elevated transition-transform hover:scale-105"
              >
                <item.icon className="h-6 w-6" />
              </button>
            );
          }

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-6 w-6" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
