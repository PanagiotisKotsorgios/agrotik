import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url =
    process.env.SUPABASE_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "http://127.0.0.1:54321";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (
          cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
        ) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh session on every request
  await supabase.auth.getUser();

  return response;
}
