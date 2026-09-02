import { createSupabaseService } from "@/lib/supabase/service";

export async function healthResponse() {
  const configured = Boolean(
    (process.env.SUPABASE_INTERNAL_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if (!configured) {
    return Response.json(
      { status: "unhealthy", database: "not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const service = createSupabaseService();
    const { error } = await service.from("regions").select("code").limit(1);
    if (error) throw error;
    return Response.json(
      { status: "ok", database: "reachable" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[health]", error);
    return Response.json(
      { status: "unhealthy", database: "unreachable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
