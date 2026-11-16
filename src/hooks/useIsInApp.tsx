import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { isInApp } from "@/lib/inApp";

/** Reads in-app state synchronously on first render, then watches for the class or `?app=1`. */
export const useIsInApp = () => {
  const location = useLocation();
  const [inApp, setInApp] = useState(isInApp);
  useEffect(() => {
    const update = () => setInApp(isInApp());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, [location.pathname, location.search]);
  return inApp;
};

export const PREMIUM_FEATURE_LINE = "This is a Premium feature.";

/** Renders children on the website; inside the app renders the fallback (nothing by default). */
export const WebsiteOnly = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => {
  const inApp = useIsInApp();
  return <>{inApp ? fallback : children}</>;
};
