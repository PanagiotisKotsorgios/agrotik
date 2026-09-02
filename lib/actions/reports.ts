"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { ActionResult } from "./auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const submitSchema = z.object({
  target_type: z.enum(["profile", "price_listing", "production_listing", "message"]),
  target_id: z.string().uuid(),
  category: z.enum(["misleading", "spam", "abuse", "privacy", "unsafe", "other"]),
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
  if (!(await consumeRateLimit("reports", user.id, 5, 3600))) {
    return { ok: false, error: "Έχεις υποβάλει πολλές αναφορές. Δοκίμασε ξανά αργότερα." };
  }

  let targetOwnerId: string | null = null;
  if (parsed.data.target_type === "profile") {
    const { data } = await supabase.from("profiles").select("id").eq("id", parsed.data.target_id).maybeSingle();
    targetOwnerId = data?.id ?? null;
  } else if (parsed.data.target_type === "price_listing") {
    const { data } = await supabase.from("price_listings").select("owner_id").eq("id", parsed.data.target_id).maybeSingle();
    targetOwnerId = data?.owner_id ?? null;
  } else if (parsed.data.target_type === "production_listing") {
    const { data } = await supabase.from("production_listings").select("owner_id").eq("id", parsed.data.target_id).maybeSingle();
    targetOwnerId = data?.owner_id ?? null;
  } else {
    const { data } = await supabase
      .from("messages")
      .select("sender_id, recipient_id")
      .eq("id", parsed.data.target_id)
      .maybeSingle();
    if (data && (data.sender_id === user.id || data.recipient_id === user.id)) {
      targetOwnerId = data.sender_id === user.id ? data.recipient_id : data.sender_id;
    }
  }
  if (!targetOwnerId) return { ok: false, error: "Ο στόχος της αναφοράς δεν βρέθηκε ή δεν είναι διαθέσιμος" };
  if (targetOwnerId === user.id) return { ok: false, error: "Δεν μπορείς να αναφέρεις δικό σου περιεχόμενο" };

  const { data: existing } = await supabase
    .from("reports")
    .select("id")
    .eq("reporter_id", user.id)
    .eq("target_type", parsed.data.target_type)
    .eq("target_id", parsed.data.target_id)
    .in("status", ["open", "reviewing"])
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: false, error: "Έχεις ήδη υποβάλει αναφορά για αυτό το περιεχόμενο" };

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
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .single();
  if (data?.role !== "admin") return null;
  return user;
}

export async function updateReport(
  id: string,
  patch: { status?: "open" | "reviewing" | "resolved" | "dismissed"; admin_note?: string },
): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const parsed = z.object({
    id: z.string().uuid(),
    status: z.enum(["open", "reviewing", "resolved", "dismissed"]).optional(),
    admin_note: z.string().trim().max(2000).optional(),
  }).safeParse({ id, ...patch });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  const svc = createSupabaseService();
  const update: any = { ...patch };
  if (parsed.data.status === "resolved" || parsed.data.status === "dismissed") {
    update.resolved_at = new Date().toISOString();
  } else if (parsed.data.status) {
    update.resolved_at = null;
  }
  const { data, error } = await svc
    .from("reports")
    .update(update)
    .eq("id", parsed.data.id)
    .select("id, reporter_id, target_type, target_id, category, status")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Η αναφορά δεν βρέθηκε" };

  const nextStatus = parsed.data.status;
  if (nextStatus === "resolved" || nextStatus === "dismissed") {
    const outcome = nextStatus === "resolved" ? "accepted" : "rejected";
    await Promise.all([
      svc.from("report_resolutions").insert({
        report_id: parsed.data.id,
        outcome,
        note: patch.admin_note ?? null,
      }),
      svc.from("notifications").insert({
        user_id: (data as any).reporter_id,
        kind: "report_resolved",
        payload: {
          outcome,
          target_type: (data as any).target_type,
          target_id: (data as any).target_id,
          category: (data as any).category,
          note: patch.admin_note ?? null,
        },
      }),
    ]);
  }

  revalidatePath("/admin/reports");
  return { ok: true };
}
