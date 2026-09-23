import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);

  const load = useCallback(async () => {
    if (!user) return setItems([]);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id,type,title,message,link,read_at,created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as AppNotification[]) || []);
  }, [user]);

  useEffect(() => {
    load();
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, load]);

  const markAllRead = async () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (!ids.length) return;
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await (supabase as any).from("notifications").update({ read_at: now }).in("id", ids);
  };

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: n.read_at || now } : n)));
    await (supabase as any).from("notifications").update({ read_at: now }).eq("id", id).is("read_at", null);
  };

  return { items, unreadCount: items.filter((n) => !n.read_at).length, markAllRead, markRead };
};
