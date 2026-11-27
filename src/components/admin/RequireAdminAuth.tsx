import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { adminLoginHref } from "@/lib/adminAuth";

/** If there is no admin session, go to founder login. A parent/app session does not count. */
const RequireAdminAuth = () => {
  const { user, loading } = useAdminAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading...</div>
    );
  }
  if (!user) {
    return <Navigate to={adminLoginHref(`${location.pathname}${location.search}`)} replace />;
  }
  return <Outlet />;
};

export default RequireAdminAuth;
