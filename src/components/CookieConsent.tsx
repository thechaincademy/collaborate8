import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { loadGa4 } from "@/lib/analytics";

const CookieConsent = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("medi8-cookie-consent");
    if (consent === "accepted") loadGa4();
    if (!consent) {
      // Small delay so it doesn't flash on load
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("medi8-cookie-consent", "accepted");
    (window as any).c8LoadClarity?.();
    (window as any).c8LoadHotjar?.();
    (window as any).c8LoadGtag?.();
    loadGa4();
    setVisible(false);
  };

  const handleDecline = () => {
    localStorage.setItem("medi8-cookie-consent", "declined");
    // Disable Hotjar if user declines
    if ((window as any).hj) {
      (window as any).hj("optOut");
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-5 shadow-elevated">
            <div className="mb-3 flex items-center gap-2">
              <Cookie className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">Cookies & Privacy</span>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
              We use essential cookies to keep the app running, and analytics and advertising cookies (Hotjar, Microsoft Clarity, Google Analytics and the Google tag) to improve your experience. Analytics and advertising cookies are only set if you click "Accept All". By clicking "Accept", you consent to our use of cookies. Read our{" "}
              <Link to="/privacy" className="underline text-foreground">Privacy Policy</Link> and{" "}
              <Link to="/cookies" className="underline text-foreground">Cookie Policy</Link>.
            </p>
            <div className="flex gap-3">
              <Button size="sm" onClick={handleAccept} className="flex-1">
                Accept All
              </Button>
              <Button size="sm" variant="outline" onClick={handleDecline} className="flex-1">
                Essential Only
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsent;
