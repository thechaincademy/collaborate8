import { supabase } from "@/integrations/supabase/client";

type TrackOptions = {
  tab?: string;
  path?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Records an in-app usage event (tab clicks, screen views) for the founders'
 * dashboard. Silent no-op when nobody is signed in.
 */
export const trackEvent = async (eventType: string, options: TrackOptions = {}) => {
  try {
    const { data } = await supabase.auth.getSession();
    const userId = data.session?.user?.id;
    if (!userId) return;

    await supabase.from("usage_events").insert({
      user_id: userId,
      event_type: eventType,
      tab: options.tab ?? null,
      path: options.path ?? window.location.pathname,
      metadata: options.metadata ?? null,
    });
  } catch (error) {
    console.warn("usage tracking failed", error);
  }
};

export const trackTab = (tab: string) => trackEvent("tab_click", { tab });
