import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SuitabilityCheck } from "@/components/safeguarding/SuitabilityCheck";
import { useSafeguarding } from "@/hooks/useSafeguarding";

const Page = () => {
  const navigate = useNavigate();
  const safety = useSafeguarding();
  if (safety.loading) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!safety.enabled) return <Navigate to="/dashboard" replace />;
  // The server decides whether the questions are due. Once answered, show a calm confirmation instead of the form.
  if (!safety.suitabilityCheckDue) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">You have already answered these questions</h1>
        <p className="text-sm text-muted-foreground">Thank you. There is nothing more to do here. Collabor8 will ask again only if it is needed.</p>
        <Button asChild><Link to="/dashboard">Back to dashboard</Link></Button>
      </main>
    );
  }
  return <SuitabilityCheck onDone={() => navigate("/dashboard")} />;
};

export default Page;
