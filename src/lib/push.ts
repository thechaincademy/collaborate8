import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY } from "./notificationTypes";

const supported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const toKey = (b64: string) => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
};

const getReg = async () => {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? (import.meta.env.PROD && window.self === window.top ? navigator.serviceWorker.register("/sw.js") : null);
};

export async function pushState(): Promise<"on" | "off" | "denied" | "unsupported"> {
  if (!supported() || window.self !== window.top) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? "on" : "off";
}

export async function enablePush(userId: string) {
  if (!supported()) return "unsupported" as const;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? ("denied" as const) : ("off" as const);
  const reg = await getReg();
  if (!reg) throw new Error("Push alerts work on collaborate8.com, not in this preview");
  await navigator.serviceWorker.ready;
  // Clear any stale subscription (e.g. created with an older key) before subscribing
  const stale = await reg.pushManager.getSubscription();
  if (stale) {
    try {
      await supabase.from("push_subscriptions" as any).delete().eq("endpoint", stale.endpoint);
      await stale.unsubscribe();
    } catch {
      /* ignore - proceed to subscribe */
    }
  }
  let sub: PushSubscription;
  try {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(VAPID_PUBLIC_KEY) });
  } catch (e) {
    console.error("push subscribe failed:", e);
    throw new Error("Your browser's push service rejected the registration. Please try again, or check that notifications are allowed for this site.");
  }
  const j = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions" as any).upsert(
    { user_id: userId, endpoint: sub.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth } as any,
    { onConflict: "endpoint" },
  );
  if (error) throw new Error("Could not save this device");
  return "on" as const;
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions" as any).delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
