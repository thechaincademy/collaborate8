// Registers the app service worker (generated at /sw.js by vite-plugin-pwa).
// Never registers in dev or inside iframes.
// Supports ?sw=off as a kill switch to unregister.

const isRefused = () => {
  if (!import.meta.env.PROD) return true;
  if (typeof window === "undefined") return true;
  if (window.self !== window.top) return true;
  return false;
};

const cleanup = async () => {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => r.active?.scriptURL.endsWith("/sw.js"))
      .map((r) => r.unregister()),
  );
};

export const registerServiceWorker = async () => {
  if (!("serviceWorker" in navigator)) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get("sw") === "off" || isRefused()) {
    await cleanup();
    return;
  }

  await navigator.serviceWorker.register("/sw.js");
};
