import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNav from "./BottomNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TutorialNextPill from "@/components/dashboard/TutorialNextPill";

interface InAppShellProps {
  children: ReactNode;
  title?: string;
}

/** Keeps the app's top menu (optional) and bottom menu on pages opened from inside the app. */
const InAppShell = ({ children, title }: InAppShellProps) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      {title && (
        <div className="mx-auto max-w-md px-6 pt-6 md:max-w-3xl lg:max-w-5xl">
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
      <main className="pb-24">{children}</main>
      <TutorialNextPill />
      <BottomNav activeTab={"" as never} onTabChange={(tab) => navigate(`/dashboard?tab=${tab}`)} />
    </div>
  );
};

export default InAppShell;
