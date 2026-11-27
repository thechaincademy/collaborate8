import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { supabaseAdmin } from "@/integrations/supabase/adminClient";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { isAdminPath, redirectToAdminLogin } from "@/lib/adminAuth";
import { cn } from "@/lib/utils";

export const ADMIN_LINKS: { to: string; label: string; end?: boolean; dsl?: boolean }[] = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/analytics", label: "Analytics" },
  { to: "/admin/monitoring", label: "Monitoring" },
  { to: "/admin/access-requests", label: "Requests to join" },
  { to: "/admin/setup", label: "Setup" },
  { to: "/dsl", label: "Safeguarding review", dsl: true },
];

/**
 * Shared admin menu: left column on desktop, scrollable bar on top on phones.
 * Admins see every admin page. A safeguarding lead who is not an admin sees only
 * Safeguarding review and Sign out. Everyone else sees the page with no menu.
 * This only controls the menu; each page keeps its own access checks.
 * /admin/* uses the admin session. /dsl uses the app session.
 */
const AdminLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const adminArea = isAdminPath(location.pathname);
  const appAuth = useAuth();
  const adminAuth = useAdminAuth();
  const { user, signOut } = adminArea ? adminAuth : appAuth;
  const client = adminArea ? supabaseAdmin : supabase;
  const navigate = useNavigate();
  const [access, setAccess] = useState<"none" | "dsl" | "admin">("none");

  useEffect(() => {
    if (!user) { setAccess("none"); return; }
    let live = true;
    // Call rpc on the client object so `this` stays bound. A detached rpc() throws
    // "Cannot read properties of undefined (reading 'rest')" and the admin nav never appears.
    const call = (fn: "is_admin" | "sg_is_dsl") =>
      (client.rpc as unknown as (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>).call(client, fn, { _user_id: user.id });
    Promise.all([call("is_admin"), call("sg_is_dsl")]).then(([a, d]) => {
      if (!live) return;
      setAccess(a.data === true ? "admin" : !d.error && d.data === true ? "dsl" : "none");
    });
    return () => { live = false; };
  }, [user, client]);

  if (access === "none") return <>{children}</>;

  const links = access === "admin" ? ADMIN_LINKS : ADMIN_LINKS.filter((l) => l.dsl);
  const handleSignOut = async () => {
    await signOut();
    if (adminArea) {
      redirectToAdminLogin();
      return;
    }
    navigate("/login", { replace: true });
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
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={item}>{l.label}</NavLink>
          ))}
          <button type="button" onClick={() => void handleSignOut()} className={cn(signOutClass, "ml-auto")}>Sign out</button>
        </div>
      </nav>
      <aside className="hidden w-56 shrink-0 border-r md:block">
        <nav aria-label="Admin" className="sticky top-0 flex flex-col gap-1 p-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{access === "admin" ? "Collabor8 admin" : "Safeguarding"}</p>
          {links.map((l) => (
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
