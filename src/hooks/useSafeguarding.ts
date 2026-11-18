import { useEffect, useState } from "react";
import { EMPTY_STATUS, fetchFamilyStatus, type FamilyStatus } from "@/lib/safeguarding/api";
import { SHARED_PAUSE_NOTICE } from "@/content/safeguarding";

export interface SafeguardingState extends FamilyStatus {
  loading: boolean;
  /** Website UI stays hidden unless this signed-in account is switched on. */
  enabled: boolean;
  paused: boolean;
  notice: string | null;
  cmsUrl: string;
  showCmsGuidance: boolean;
}

export function useSafeguarding(): SafeguardingState {
  const [state, setState] = useState<SafeguardingState>({
    ...EMPTY_STATUS,
    loading: true,
    enabled: false,
    paused: false,
    notice: null,
    cmsUrl: "https://www.gov.uk/child-maintenance-service/payments#collect-and-pay",
    showCmsGuidance: false,
  });

  useEffect(() => {
    let cancelled = false;
    fetchFamilyStatus()
      .then((status) => {
        if (cancelled) return;
        const envOn = import.meta.env.VITE_SAFEGUARDING_ENABLED === "true";
        const enabled = envOn && status.safeguardingEnabled;
        const paused = enabled && status.sharedToolsPaused;
        setState({
          ...status,
          loading: false,
          enabled,
          paused,
          notice: paused ? SHARED_PAUSE_NOTICE : null,
          cmsUrl: "https://www.gov.uk/child-maintenance-service/payments#collect-and-pay",
          showCmsGuidance: enabled && status.moneyGuidance,
        });
      })
      .catch(() => {
        if (!cancelled) setState((prev) => ({ ...prev, ...EMPTY_STATUS, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
