import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { isInternalUser, markInternalDevice } from "@/lib/internalTraffic";

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  coparent_id: string | null;
  invite_code: string | null;
  created_at: string;
  updated_at: string;
  is_test_account?: boolean | null;
}

// Shared in-memory cache so tabs that mount later render instantly
let profileCache: Profile | null = null;

/** Drop the shared cache (sign-out or account switch in the same tab). */
export const clearProfileCache = () => {
  profileCache = null;
};

export const useProfile = () => {
  const { user } = useAuth();
  const cached = user && profileCache?.id === user.id ? profileCache : null;
  const [profile, setProfileState] = useState<Profile | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const setProfile = (next: Profile | null | ((prev: Profile | null) => Profile | null)) => {
    setProfileState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      if (value) profileCache = value;
      return value;
    });
  };

  const userId = user?.id ?? null;
  const userEmail = user?.email ?? null;

  useEffect(() => {
    if (!user) {
      clearProfileCache();
      setProfileState(null);
      setLoading(false);
      return;
    }
    // A different account in the same tab: never show the old user's profile
    // (and its coparent_id) while the new one loads.
    if (profileCache && profileCache.id !== user.id) clearProfileCache();
    setProfileState((prev) => (prev && prev.id === user.id ? prev : profileCache));

    const fetchProfile = async () => {
      if (!(profileCache?.id === user.id)) setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
        if (isInternalUser({ email: user.email, isTestAccount: (data as Profile).is_test_account })) markInternalDevice();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userEmail && isInternalUser({ email: userEmail })) markInternalDevice();
  }, [userEmail]);

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
