import { Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { SuitabilityCheck } from "@/components/safeguarding/SuitabilityCheck";
import { useSafeguarding } from "@/hooks/useSafeguarding";

const Page = () => {
  const navigate = useNavigate();
  const safety = useSafeguarding();
  if (safety.loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!safety.enabled) return <Navigate to="/dashboard" replace />;
  return <SuitabilityCheck onDone={() => navigate("/dashboard")} />;
};

export default Page;
