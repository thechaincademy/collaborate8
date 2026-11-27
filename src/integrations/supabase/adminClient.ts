// Separate Supabase client for the admin area. It uses its own storage key so
// a founder can be signed in to /admin at the same time as a parent is signed
// in to the app, and signing out of one does not affect the other.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { ADMIN_STORAGE_KEY } from "@/lib/adminAuth";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export { ADMIN_STORAGE_KEY };

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    storageKey: ADMIN_STORAGE_KEY,
    persistSession: true,
    autoRefreshToken: true,
    // Admin magic links go through /auth/confirm and verifyOtp, not the URL hash.
    detectSessionInUrl: false,
  },
});
