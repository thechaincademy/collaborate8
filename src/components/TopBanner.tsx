import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const TopBanner = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleWaitlistClick = () => {
    if (location.pathname === "/") {
      const el = document.getElementById("waitlist");
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    navigate("/#waitlist");
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center">
          <img
            src={collabor8Wordmark}
            alt="collabor8"
            className="h-8 w-auto md:h-9"
          />
        </Link>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/child-maintenance-calculator"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Calculator
          </Link>
          <Link
            to="/resources/child-maintenance-guide"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline"
          >
            Guide
          </Link>
          <Link
            to="/resources/support-and-guidance"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground md:inline"
          >
            Money Help
          </Link>
          <Button size="sm" onClick={handleWaitlistClick} className="rounded-full">
            Join the Waiting List
          </Button>
        </div>
      </div>
    </nav>
  );
};

export default TopBanner;
