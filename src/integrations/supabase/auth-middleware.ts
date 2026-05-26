import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// Server-side auth helper — kept for reference, not used in SPA mode.
// Variables match the .env file (VITE_ prefix works in both Vite client
// and Node/edge server contexts when loaded via dotenv/Vite's env loading).
export function createServerSupabaseClient(authToken: string) {
  const url = process.env.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing Supabase environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.",
    );
  }

  return createClient<Database>(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${authToken}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}
