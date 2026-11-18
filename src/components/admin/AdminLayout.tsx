import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export const ADMIN_LINKS: { to: string; label: string; end?: boolean }[] = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/monitoring", label: "Monitoring" },
  { to: "/admin/setup", label: "Setup" },
  { to: "/dsl", label: "Safeguarding review" },
];

/** Shared admin menu: left column on desktop, scrollable bar on top on phones. Admins only. */
const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    let live = true;
    supabase.rpc("is_admin", { _user_id: user.id }).then(({ data }) => { if (live) setIsAdmin(Boolean(data)); });
    return () => { live = false; };
  }, [user]);

  if (!isAdmin) return <>{children}</>;

  const handleSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };
  const signOutClass = "whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  const item = ({ isActive }: { isActive: boolean }) =>
    cn(
      "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
    );

  return (
    <div className="min-h-screen md:flex">
      <nav aria-label="Admin" className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur md:hidden">
        <div className="flex gap-1 overflow-x-auto px-3 py-2">
          {ADMIN_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={item}>{l.label}</NavLink>
          ))}
          <button type="button" onClick={() => void handleSignOut()} className={cn(signOutClass, "ml-auto")}>Sign out</button>
        </div>
      </nav>
      <aside className="hidden w-56 shrink-0 border-r md:block">
        <nav aria-label="Admin" className="sticky top-0 flex flex-col gap-1 p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collabor8 admin</p>
          {ADMIN_LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={item}>{l.label}</NavLink>
          ))}
          <div className="mt-4 border-t pt-4">
            <button type="button" onClick={() => void handleSignOut()} className={cn(signOutClass, "w-full")}>Sign out</button>
          </div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
};

export default AdminLayout;
