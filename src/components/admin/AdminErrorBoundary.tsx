import { Component, type ErrorInfo, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { adminLoginHref } from "@/lib/adminAuth";

interface State { error: boolean }

/**
 * Admin pages must never render as a blank white screen. If something throws,
 * show a short message and a way back to founder sign-in.
 */
class AdminErrorBoundary extends Component<{ children?: ReactNode }, State> {
  state: State = { error: false };

  static getDerivedStateFromError(): State {
    return { error: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error("admin page error", error.name);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-xl font-semibold">This page could not load</h1>
          <p className="text-sm text-muted-foreground">
            Something went wrong in the admin area. Sign in with your founder email to try again.
          </p>
          <a href={adminLoginHref("/admin")} className="rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground">
            Sign in to admin
          </a>
        </div>
      );
    }
    return this.props.children ?? <Outlet />;
  }
}

export default AdminErrorBoundary;
