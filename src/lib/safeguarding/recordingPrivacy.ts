import { useEffect } from "react";

/** Routes whose whole viewport must stay out of session recording. */
export const SAFEGUARDING_PATHS = ["/safeguarding", "/dsl", "/internal/safeguarding-preview"] as const;

export function isSafeguardingPath(pathname: string): boolean {
  return SAFEGUARDING_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

let depth = 0;

function maskDocument() {
  const root = document.documentElement;
  root.setAttribute("data-clarity-mask", "true");
  root.setAttribute("data-hj-suppress", "true");
  root.classList.add("hj-suppress");
  // Do not call clarity("set", "sg", "1"). Masking is the route control.
  // Do not call hj("stateChange"). That would record this navigation.
}

function unmaskDocument() {
  const root = document.documentElement;
  root.removeAttribute("data-clarity-mask");
  root.removeAttribute("data-hj-suppress");
  root.classList.remove("hj-suppress");
}

/** Pause session recording while a safeguarding surface is open. Runs before paint. */
export function useSafeguardingRecording() {
  if (typeof document !== "undefined") maskDocument();
  useEffect(() => {
    depth += 1;
    maskDocument();
    return () => {
      depth -= 1;
      if (depth <= 0) {
        depth = 0;
        unmaskDocument();
      }
    };
  }, []);
}

export function safeguardingSurfaceActive(): boolean {
  return depth > 0;
}

export const RECORDING_MASK_PROPS = {
  "data-clarity-mask": "true",
  "data-hj-suppress": "true",
} as const;
