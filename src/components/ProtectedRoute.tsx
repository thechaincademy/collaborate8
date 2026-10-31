import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { ensureProfileComplete, type CompletionResult } from "@/lib/profileCompletion";
import CompleteProfile from "@/components/CompleteProfile";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Remember users already confirmed complete this session, so routes don't re-check.
const completedUsers = new Set<string>();

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center bg-background">
    <p className="text-muted-foreground">Loading...</p>
  </div>
);

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [status, setStatus] = useState<CompletionResult | "checking">(
    user && completedUsers.has(user.id) ? "complete" : "checking",
  );

  useEffect(() => {
    if (!user) return;
    if (completedUsers.has(user.id)) {
      setStatus("complete");
      return;
    }
    let cancelled = false;
    setStatus("checking");
    ensureProfileComplete(user)
      .then((r) => {
        if (r === "complete") completedUsers.add(user.id);
        if (!cancelled) setStatus(r);
      })
      .catch(() => !cancelled && setStatus("complete"));
    return () => {
      cancelled = true;
    };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (status === "checking") return <Loading />;
  if (status === "needs_input") {
    return (
      <div className="app-ui">
        <CompleteProfile
          userId={user.id}
          onDone={() => {
            completedUsers.add(user.id);
            setStatus("complete");
          }}
        />
      </div>
    );
  }

  return <div className="app-ui">{children}</div>;
};

export default ProtectedRoute;
