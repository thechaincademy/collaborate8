import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User, Bell, Settings, LogOut, X, CreditCard, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

interface DashboardHeaderProps {
  title: string;
}

const DashboardHeader = ({ title }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const { items, unreadCount, markAllRead, markRead } = useNotifications();
  const notifications = items.map((n) => ({
    ...n,
    read: !!n.read_at,
    time: formatDistanceToNow(new Date(n.created_at), { addSuffix: true }),
  }));

  const handleLogout = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const openNotification = (n: { id: string; link: string | null }) => {
    markRead(n.id);
    setNotificationOpen(false);
    if (n.link) navigate(n.link);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "maintenance":
      case "payment_method":
        return <CreditCard className="h-4 w-4" />;
      case "due":
        return <Clock className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-10 flex items-center justify-between"
    >
      {/* Avatar Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button aria-label="Open user menu" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent">
            <User className="h-5 w-5 text-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-48">
          <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <h1 className="text-lg font-semibold text-foreground">{title}</h1>

      {/* Notifications Popover */}
      <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
        <PopoverTrigger asChild>
          <button aria-label="Open notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card transition-colors hover:bg-accent">
            <Bell className="h-5 w-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <button
              onClick={() => setNotificationOpen(false)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div>
                {notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => openNotification(notification)}
                    className={`flex w-full gap-3 text-left border-b border-border p-4 last:border-0 ${
                      !notification.read ? "bg-accent/50" : ""
                    }`}
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                      !notification.read ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {notifications.length > 0 && (
            <div className="border-t border-border p-3">
              <Button variant="ghost" className="w-full text-sm" onClick={markAllRead} disabled={unreadCount === 0}>
                Mark all as read
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </motion.div>
  );
};

export default DashboardHeader;
