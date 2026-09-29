import { Bell, MessageSquare, ShieldCheck, Clock, AlertTriangle, Repeat, CheckCircle2, CalendarClock, CreditCard } from "lucide-react";

// Keep in sync with supabase/functions/send-notification-email/index.ts
export const NOTIFICATION_CATEGORIES = [
  { key: "message", label: "New message", desc: "A new chat or decision message", icon: MessageSquare, cls: "bg-muted text-foreground" },
  { key: "ack_required", label: "Needs acknowledgement", desc: "Your co-parent asked you to confirm you've seen something", icon: ShieldCheck, cls: "bg-status-awaiting/10 text-status-awaiting" },
  { key: "deadline_soon", label: "Deadline coming up", desc: "A reply-by time is within 24 hours", icon: Clock, cls: "bg-status-soon/10 text-status-soon" },
  { key: "deadline_missed", label: "Missed deadline", desc: "A reply-by time passed without agreement", icon: AlertTriangle, cls: "bg-status-overdue/10 text-status-overdue" },
  { key: "proposal", label: "Proposed change", desc: "Your co-parent suggested a different plan", icon: Repeat, cls: "bg-status-awaiting/10 text-status-awaiting" },
  { key: "confirmed", label: "Agreement confirmed", desc: "A decision was agreed", icon: CheckCircle2, cls: "bg-status-ok/10 text-status-ok" },
  { key: "calendar", label: "Calendar reminder", desc: "Exchanges and payments due tomorrow", icon: CalendarClock, cls: "bg-primary/15 text-foreground" },
  { key: "money", label: "Payments and expenses", desc: "Maintenance, expense and payment updates", icon: CreditCard, cls: "bg-primary/15 text-foreground" },
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number]["key"];

export function categoryOf(type: string): NotificationCategory {
  if (type === "thread_ack_required") return "ack_required";
  if (type === "thread_deadline_soon") return "deadline_soon";
  if (type === "thread_deadline_missed") return "deadline_missed";
  if (type === "thread_propose") return "proposal";
  if (type === "thread_confirm") return "confirmed";
  if (type === "calendar_reminder" || type === "due") return "calendar";
  if (type === "message" || type.startsWith("thread_")) return "message";
  return "money";
}

export const categoryMeta = (type: string) =>
  NOTIFICATION_CATEGORIES.find((c) => c.key === categoryOf(type)) ?? { key: "money", label: "Update", icon: Bell, cls: "bg-muted text-foreground", desc: "" };

export const VAPID_PUBLIC_KEY = "BKY6fhKM0N_Ca_ppKBJwnLpt-JVYcdDXsPNK4zBlE9f6PZspEosZnAuWEi_axQnaGUm4_T0oEkd5UFI_qqeUEHw";
