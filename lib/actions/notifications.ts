"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export async function deleteNotification(id: string): Promise<ActionResult> {
  const parsed = z.string().uuid().safeParse(id);
  if (!parsed.success) return { ok: false, error: "Μη έγκυρη ειδοποίηση" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", parsed.data)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function clearNotifications(): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error } = await supabase.from("notifications").delete().eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/notifications");
  return { ok: true };
}
