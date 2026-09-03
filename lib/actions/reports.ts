"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { ActionResult } from "./auth";

const submitSchema = z.object({
  target_type: z.enum(["profile", "price_listing", "production_listing", "message"]),
  target_id: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
});

export async function submitReport(input: unknown): Promise<ActionResult> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    ...parsed.data,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/reports");
  return { ok: true };
}

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") return null;
  return user;
}

export async function updateReport(
  id: string,
  patch: { status?: "open" | "reviewing" | "resolved" | "dismissed"; admin_note?: string },
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const svc = createSupabaseService();
  const update: any = { ...patch };
  if (patch.status === "resolved" || patch.status === "dismissed") {
    update.resolved_at = new Date().toISOString();
  }
  const { error } = await svc.from("reports").update(update).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/reports");
  return { ok: true };
}
