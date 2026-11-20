export type DashboardTab = "home" | "maintenance" | "expenses" | "benefits" | "chat" | "resources";

export const VALID_TABS: DashboardTab[] = ["home", "maintenance", "expenses", "benefits", "chat", "resources"];

// On the website these tabs keep their nav item and show the Coming soon modal.
// The in-app web view does not open them (Benefits falls back to Home).
export const COMING_SOON_TABS: DashboardTab[] = ["benefits"];

export const isValidDashboardTabParam = (rawTab: string | null): boolean =>
  rawTab === "documents" || (rawTab !== null && (VALID_TABS as string[]).includes(rawTab));

export const requestedDashboardTab = (rawTab: string | null): DashboardTab => {
  if (rawTab === "documents") return "chat";
  if (rawTab !== null && (VALID_TABS as string[]).includes(rawTab)) return rawTab as DashboardTab;
  return "home";
};

// Inside the mobile app the Benefits area is not available, so it falls back to Home.
// On the website Benefits stays selected so the Coming soon modal can show.
export const activeDashboardTab = (rawTab: string | null, inApp: boolean): DashboardTab => {
  const requested = requestedDashboardTab(rawTab);
  return inApp && requested === "benefits" ? "home" : requested;
};

export const isComingSoonTab = (tab: DashboardTab, inApp: boolean): boolean =>
  !inApp && COMING_SOON_TABS.includes(tab);
