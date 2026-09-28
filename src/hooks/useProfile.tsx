import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  coparent_id: string | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
}

export const useProfile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
      setLoading(false);
    };

    fetchProfile();

    // Keep co-parent status in sync across the whole app
    const refresh = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) setProfile(data as Profile);
    };
    const onEvent = () => refresh();
    window.addEventListener("c8-profile-refresh", onEvent);
    window.addEventListener("focus", onEvent);
    const channel = supabase
      .channel(`profile-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        (payload) => setProfile(payload.new as Profile))
      .subscribe();
    const poll = setInterval(refresh, 20000);
    return () => {
      window.removeEventListener("c8-profile-refresh", onEvent);
      window.removeEventListener("focus", onEvent);
      supabase.removeChannel(channel);
      clearInterval(poll);
    };
  }, [user]);

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("Not authenticated") };

    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);

    if (!error) {
      setProfile((prev) => prev ? { ...prev, ...updates } : null);
      window.dispatchEvent(new Event("c8-profile-refresh"));
    }
    return { error };
  };

  const isManaging = profile?.role === "managing";
  const isViewing = profile?.role === "viewing";

  return { profile, loading, updateProfile, isManaging, isViewing };
};
