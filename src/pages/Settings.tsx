import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, HelpCircle, FileText, Shield, ChevronRight, Download, Loader2, Lock, Users, Trash2, PoundSterling, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { NOTIFICATION_CATEGORIES } from "@/lib/notificationTypes";
import { disablePush, enablePush, pushState } from "@/lib/push";

type Prefs = Record<string, { push?: boolean; email?: boolean }>;

const Section = ({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) => (
  <motion.section id={id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-7">
    <h3 className="mb-3 text-sm font-medium text-muted-foreground">{title}</h3>
    <div className="overflow-hidden rounded-2xl border border-border bg-card">{children}</div>
  </motion.section>
);

const Settings = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [prefs, setPrefs] = useState<Prefs>({});
  const [push, setPush] = useState<"on" | "off" | "denied" | "unsupported">("off");
  const [pushBusy, setPushBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    pushState().then(setPush);
    if (!user) return;
    supabase.from("notification_preferences" as any).select("prefs").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setPrefs(((data as any)?.prefs ?? {}) as Prefs));
  }, [user]);

  useEffect(() => {
    if (window.location.hash) document.querySelector(window.location.hash)?.scrollIntoView();
  }, []);

  const setPref = async (key: string, channel: "push" | "email", value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: { ...prefs[key], [channel]: value } };
    setPrefs(next);
    const { error } = await supabase.from("notification_preferences" as any).upsert({ user_id: user.id, prefs: next } as any);
    if (error) toast.error("Could not save that setting");
  };

  const togglePush = async () => {
    if (!user) return;
    setPushBusy(true);
    try {
      if (push === "on") { await disablePush(); setPush("off"); toast.success("Push alerts turned off on this device"); }
      else { const s = await enablePush(user.id); setPush(s); if (s === "on") toast.success("Push alerts turned on for this device"); else if (s === "denied") toast.error("Alerts are blocked in your browser settings"); }
    } catch (e) {
      toast.error((e as Error).message || "Could not turn on push alerts");
    } finally { setPushBusy(false); }
  };

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    const tables = ["profiles", "messages", "decision_threads", "thread_events", "expense_requests", "recurring_payments", "payments", "manual_payments", "invitations", "notifications", "notification_preferences", "conversation_tool_responses"];
    const out: Record<string, unknown> = { exported_at: new Date().toISOString(), account: { id: user.id, email: user.email } };
    for (const t of tables) {
      const { data } = await supabase.from(t as any).select("*").limit(5000);
      out[t] = data ?? [];
    }
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `collabor8-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setExporting(false);
    toast.success("Your data has been downloaded");
  };

  const deleteAccount = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-account");
    setDeleting(false);
    const d = data as { status?: string; message?: string; error?: string } | null;
    if (d?.error === "active_payment" || (error && (error as any).context?.status === 409)) {
      setConfirmDelete(false);
      toast.error("Please stop your recurring maintenance payment first.");
      return;
    }
    if (error || d?.error) return toast.error("Could not delete your account - please try again");
    toast.success(d?.message ?? "Your account has been deleted");
    await signOut();
    navigate("/");
  };

  const pushLabel = push === "on" ? "On for this device" : push === "denied" ? "Blocked in browser settings" : push === "unsupported" ? "Open collaborate8.com on your phone (added to home screen on iPhone)" : "Off";

  return (
    <div className="mx-auto min-h-screen max-w-md bg-background pb-24 md:max-w-2xl">
      <div className="px-6 pt-4">
        <div className="mb-6 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex h-10 w-10 items-center justify-center" aria-label="Back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      <div className="px-6">
        <Section title="Notifications" id="notifications">
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

        <Section title="Privacy and your data" id="privacy">
          <div className="space-y-3 border-b border-border p-4 text-sm">
            <div className="flex gap-3">
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-foreground/90"><span className="font-medium text-foreground">Shared with your co-parent:</span> chat messages, decision threads and their timeline, expense requests, attachments you send, and maintenance payment amounts and dates.</p>
            </div>
            <div className="flex gap-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-foreground/90"><span className="font-medium text-foreground">Private to you:</span> these notification settings, your drafts and "Rewrite calmly" suggestions, your bank and card details, your financial health score and your login.</p>
            </div>
            <div className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
              <p className="text-foreground/90"><span className="font-medium text-foreground">What we keep and why:</span> messages and decision timelines can't be edited or deleted, so both of you have a reliable record if you ever need one. Payment records are kept for 6 years because UK tax and fraud rules require it.</p>
            </div>
          </div>
          <button onClick={exportData} disabled={exporting} className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50">
            <span className="flex items-center gap-3"><Download className="h-5 w-5 text-muted-foreground" /><span className="text-foreground">Download my data</span></span>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          </button>
          <p className="px-4 pb-3 text-xs text-muted-foreground">Available any time. You never need your co-parent's permission.</p>
        </Section>

        <Section title="Account" id="account">
          <button onClick={() => navigate("/dashboard?tab=maintenance")} className="flex w-full items-center justify-between border-b border-border p-4 text-left hover:bg-muted/50">
            <span className="flex items-center gap-3"><PoundSterling className="h-5 w-5 text-muted-foreground" /><span className="text-foreground">Stop a recurring payment</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
          <button onClick={() => setConfirmDelete(true)} className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50">
            <span className="flex items-center gap-3"><Trash2 className="h-5 w-5 text-destructive" /><span className="text-destructive">Delete my account</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </Section>

        <Section title="Support">
          {[
            { icon: HelpCircle, label: "Help Centre", to: "/faq" },
            { icon: FileText, label: "Cookie Policy", to: "/cookies" },
            { icon: Shield, label: "Privacy Policy", to: "/privacy" },
          ].map((it, i) => (
            <button key={it.label} onClick={() => navigate(it.to)} className={`flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 ${i < 2 ? "border-b border-border" : ""}`}>
              <span className="flex items-center gap-3"><it.icon className="h-5 w-5 text-muted-foreground" /><span className="text-foreground">{it.label}</span></span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </Section>
        <p className="flex items-center gap-2 pb-6 text-xs text-muted-foreground"><Bell className="h-3.5 w-3.5" /> App version 1.1.0</p>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              You'll be signed out and unlinked from your co-parent. Download your data first if you want a copy. Records your co-parent already received stay in their account, and payment records are kept for 6 years by law.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep my account</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); deleteAccount(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
