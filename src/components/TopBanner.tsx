import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const TopBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleWaitlistClick = () => {
    navigate("/signup");
  };


  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="mx-auto flex max-w-5xl flex-nowrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground">
            <span className="text-sm font-bold text-background">C8</span>
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            Collabor8
          </span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            to="/about"
            className="hidden whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            About Us
          </Link>
          <Link
            to="/podcast"
            className="hidden whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            The Blog
          </Link>
          <Link
            to="/child-maintenance-calculator"
            className="hidden whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Calculator
          </Link>
          <Link
            to="/resources/child-maintenance-guide"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline"
          >
            Guide
          </Link>
          {user ? (
            <Button size="sm" onClick={() => navigate("/dashboard")} className="rounded-full">
              Back to app
            </Button>
          ) : (
            <Button size="sm" onClick={handleWaitlistClick} className="rounded-full">
              Sign Up
            </Button>
          )}

        </div>
      </div>
    </nav>
  );
};

export default TopBanner;
