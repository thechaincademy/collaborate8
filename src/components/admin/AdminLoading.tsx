import { useEffect, useState } from "react";
import { ADMIN_AUTH_WAIT_MS, ADMIN_LOGIN_PATH } from "@/lib/adminAuth";

/** Full-page admin wait state. After 5 seconds, offer a sign-in link so the page is never left empty. */
const AdminLoading = ({ message = "Loading..." }: { message?: string }) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), ADMIN_AUTH_WAIT_MS);
    return () => window.clearTimeout(t);
  }, []);

  if (timedOut) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-xl font-semibold">This page is taking too long</h1>
        <p className="text-sm text-muted-foreground">
          Sign in with your founder email to continue.
        </p>
        <a
          href={ADMIN_LOGIN_PATH}
          className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground"
        >
          Sign in to admin
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
};

export default AdminLoading;
