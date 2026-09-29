import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, Loader2, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationTypes";
import { disablePush, enablePush, pushState } from "@/lib/push";

type Prefs = Record<string, { push?: boolean; email?: boolean }>;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
    <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
    <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
  </motion.section>
);

const NotificationSettings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({});
  const [push, setPush] = useState<"on" | "off" | "denied" | "unsupported">("off");
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    pushState().then(setPush);
    if (!user) return;
    supabase.from("notification_preferences" as any).select("prefs").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setPrefs(((data as any)?.prefs ?? {}) as Prefs));
  }, [user]);

  const setPref = async (key: string, channel: "push" | "email", value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: { ...prefs[key], [channel]: value } };
    setPrefs(next);
    const { error } = await supabase.from("notification_preferences" as any).upsert({ user_id: user.id, prefs: next } as any);
    if (error) toast.error("Could not save that setting");
  };

  const turnOffAll = async () => {
    if (!user) return;
    await disablePush();
    const next: Prefs = {};
    for (const c of NOTIFICATION_CATEGORIES) next[c.key] = { push: false, email: false };
    setPrefs(next);
    const { error } = await supabase.from("notification_preferences" as any).upsert({ user_id: user.id, prefs: next } as any);
    if (error) { toast.error("Could not save that setting"); return; }
    setPush("off");
    toast.success("All notifications turned off");
  };

  const togglePush = async () => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (push === "on") { await turnOffAll(); }
      else { const s = await enablePush(user.id); setPush(s); if (s === "on") toast.success("Push alerts turned on for this device"); else if (s === "denied") toast.error("Alerts are blocked in your browser settings"); }
    } catch (e) {
      toast.error((e as Error).message || "Could not turn on push alerts");
    } finally { setPushBusy(false); }
  };

  const pushLabel = push === "on" ? "On for this device" : push === "denied" ? "Blocked in browser settings" : push === "unsupported" ? "Open collaborate8.com on your phone (added to home screen on iPhone)" : "Off";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24 md:max-w-2xl">
      <div className="px-6 pt-4">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
        </div>
      </div>

      <div className="px-6">
        <Section title="This device">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-start gap-3">
              <Smartphone className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-foreground">Push alerts on this device</p>
                <p className="text-xs text-muted-foreground">{pushLabel}</p>
              </div>
            </div>
            <Button size="sm" variant={push === "on" ? "outline" : "default"} onClick={togglePush} disabled={pushBusy || push === "unsupported"}>
              {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : push === "on" ? "Turn off" : "Turn on"}
            </Button>
          </div>
        </Section>

        <Section title="What you get alerted about">
          <div className="grid grid-cols-[1fr_52px_52px] items-center gap-2 border-b border-border px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Alert</span><span className="text-center">Push</span><span className="text-center">Email</span>
          </div>
          {NOTIFICATION_CATEGORIES.map((c, i) => (
            <div key={c.key} className={`grid grid-cols-[1fr_52px_52px] items-center gap-2 px-4 py-3 ${i < NOTIFICATION_CATEGORIES.length - 1 ? "border-b border-border" : ""}`}>
              <div className="flex min-w-0 items-start gap-2.5">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${c.cls}`}><c.icon className="h-3.5 w-3.5" /></span>
                <div className="min-w-0">
                  <p className="text-sm text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
              </div>
              <div className="flex justify-center"><Switch aria-label={`${c.label} push`} checked={prefs[c.key]?.push !== false} onCheckedChange={(v) => setPref(c.key, "push", v)} /></div>
              <div className="flex justify-center"><Switch aria-label={`${c.label} email`} checked={prefs[c.key]?.email !== false} onCheckedChange={(v) => setPref(c.key, "email", v)} /></div>
            </div>
          ))}
          <p className="border-t border-border bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            Every alert also appears under the bell in the app. Email is the backup if push can't reach you.
          </p>
        </Section>

        <p className="flex items-center gap-2 pb-6 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" /> App version 1.1.0</p>
      </div>
    </div>
  );
};

export default NotificationSettings;
