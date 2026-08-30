import { createClient } from "@supabase/supabase-js";

// Placeholder JWT (matches the local supabase demo secret) used only when
// SUPABASE_SERVICE_ROLE_KEY is missing — prevents createClient from throwing
// during Next.js build-time module analysis. Any real request with this key
// will 401 at runtime; callers should tolerate that gracefully.
const PLACEHOLDER_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

/**
 * Service-role Supabase client — BYPASSES RLS.
 * Only use inside Server Actions AFTER an explicit auth+role check.
 */
export function createSupabaseService() {
  const url =
    process.env.SUPABASE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || PLACEHOLDER_KEY;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
