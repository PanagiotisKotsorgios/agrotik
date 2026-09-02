"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export async function toggleFavorite(targetId: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(targetId);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρο προφίλ" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || me.role === "admin") return { ok: false, error: "Δεν επιτρέπεται" };
  if (user.id === parsedId.data) return { ok: false, error: "Δεν μπορείς να προσθέσεις τον εαυτό σου" };

  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", parsedId.data)
    .eq("is_active", true)
    .eq("is_public", true)
    .is("deleted_at", null)
    .maybeSingle();
  if (!target) return { ok: false, error: "Το προφίλ δεν είναι διαθέσιμο" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("target_id", parsedId.data)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", parsedId.data);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("favorites").insert({ user_id: user.id, target_id: parsedId.data });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/profile/${parsedId.data}`);
  revalidatePath("/dashboard/favorites");
  return { ok: true };
}
