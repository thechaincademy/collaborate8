import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "./BottomNav";
import { useIsInApp } from "@/hooks/useIsInApp";
import DashboardHeader from "@/components/dashboard/DashboardHeader";

interface InAppShellProps {
  children: ReactNode;
  title?: string;
}

/** Keeps the app's top menu (optional) and bottom menu on pages opened from inside the app. */
const InAppShell = ({ children, title }: InAppShellProps) => {
  const navigate = useNavigate();
  const inApp = useIsInApp();
  return (
    <div className="flex h-dvh flex-col bg-background">
      {title && (
        <div className="mx-auto w-full shrink-0 max-w-md px-6 pt-6 md:max-w-3xl lg:max-w-5xl">
          <button
            onClick={() => navigate("/dashboard")}
            className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>
          <DashboardHeader title={title} />
        </div>
      )}
      <main className={inApp ? "min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1.5rem)]" : "min-h-0 flex-1 overflow-y-auto"}>{children}</main>
      <BottomNav activeTab={"" as never} onTabChange={(tab) => navigate(`/dashboard?tab=${tab}`)} />
    </div>
  );
};

export default InAppShell;
