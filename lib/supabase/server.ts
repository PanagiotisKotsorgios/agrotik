import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Supabase client for use in Server Components, Server Actions, and Route Handlers.
 * Uses the user's JWT from cookies — respects RLS.
 */
export async function createSupabaseServer() {
  const cookieStore = await cookies();
  // Server calls prefer the internal URL (avoid round-tripping through
  // the public origin) but fall back to the public one.
  const url =
    process.env.SUPABASE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            /* called from a Server Component — safe to ignore */
          }
        },
      },
    },
  );
}
