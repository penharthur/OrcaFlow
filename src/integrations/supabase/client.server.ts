// Server-side Supabase client with service role — bypasses RLS.
// Only used for trusted server-side operations; never exposed to client code.
// Not active in SPA mode; kept here for future edge/API route usage.
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

function createSupabaseAdminClient() {
  const url = process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing Supabase environment variables: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
