import { useState, useEffect, createContext, useContext } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { ADMIN_AUTH_WAIT_MS } from "@/lib/adminAuth";
import { ADMIN_STORAGE_KEY, signOutAndClear } from "@/lib/authStorage";

interface AdminAuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { data: { subscription } } = supabaseAdmin.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const timeout = window.setTimeout(() => {
      if (!cancelled) setLoading(false);
    }, ADMIN_AUTH_WAIT_MS);

    supabaseAdmin.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (cancelled) return;
      window.clearTimeout(timeout);
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear React state first so the login form can show immediately, then drop storage.
    setSession(null);
    setUser(null);
    setLoading(false);
    await signOutAndClear(supabaseAdmin, ADMIN_STORAGE_KEY);
  };

  return (
    <AdminAuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (context === undefined) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
