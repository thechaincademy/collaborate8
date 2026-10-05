import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TopBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleWaitlistClick = () => {
    navigate("/splash");
  };


  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
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
            className="whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Podcast
          </Link>
          <Link
            to="/child-maintenance-calculator"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Calculator
          </Link>
          <Link
            to="/resources/child-maintenance-guide"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline"
          >
            Guide
          </Link>
          <Button size="sm" onClick={handleWaitlistClick} className="rounded-full">
            Sign Up
          </Button>

        </div>
      </div>
    </nav>
  );
};

export default TopBanner;
