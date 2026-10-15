import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const mightHaveStoredSession = () => {
  if (typeof window === "undefined") return false;

  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && /^sb-.+-auth-token$/.test(key) && localStorage.getItem(key)) {
        return true;
      }
    }
  } catch {
    // Storage can be unavailable in private browsing or embedded contexts.
  }

  // Embedded Lovable previews can restore a session from the editor broker,
  // even when this origin has no local copy yet.
  const previewZones = ["lovableproject.com", "lovableproject-dev.com", "lovable.app", "gpt-eng.com", "gptengineer.run"];
  const isPreview = previewZones.some((zone) =>
    window.location.hostname === zone || window.location.hostname.endsWith(`.${zone}`),
  );
  return isPreview && window.parent !== window;
};

const RedirectIfSignedIn = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  const [storedSessionPossible] = useState(mightHaveStoredSession);

  if (user) return <Navigate to="/dashboard" replace />;

  if (loading && storedSessionPossible) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading Collabor8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground motion-reduce:animate-none" aria-hidden="true" />
      </div>
    );
  }

  return <>{children}</>;
};

export default RedirectIfSignedIn;