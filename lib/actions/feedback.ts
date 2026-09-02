"use server";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { consumeRateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "./auth";

const feedbackSchema = z.object({
  kind: z.enum(["bug", "idea", "praise", "other"]),
  message: z.string().trim().min(3, "Γράψε λίγο περισσότερα").max(4000, "Το κείμενο είναι πολύ μεγάλο"),
  page_path: z.string().trim().max(200).optional().nullable(),
});

export async function submitFeedback(input: unknown): Promise<ActionResult> {
  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  if (!(await consumeRateLimit("feedback", user.id, 10, 3600))) {
    return { ok: false, error: "Έχεις στείλει πολλά μηνύματα. Δοκίμασε ξανά αργότερα." };
  }
  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    kind: parsed.data.kind,
    message: parsed.data.message,
    page_path: parsed.data.page_path ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
