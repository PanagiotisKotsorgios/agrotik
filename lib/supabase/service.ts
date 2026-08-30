import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — BYPASSES RLS.
 * Only use inside Server Actions AFTER an explicit auth+role check.
 *
 * Returns a client that will fail on first call when env is missing, but does
 * not throw at import time (important for Next.js build-time analysis).
 */
export function createSupabaseService() {
  const url =
    process.env.SUPABASE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
