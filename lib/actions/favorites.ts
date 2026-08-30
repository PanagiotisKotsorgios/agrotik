"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

export async function toggleFavorite(targetId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "farmer") return { ok: false, error: "Μόνο αγρότες μπορούν να προσθέτουν αγαπημένα" };

  const { data: existing } = await supabase
    .from("favorites")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("target_id", targetId)
    .maybeSingle();

  if (existing) {
    await supabase.from("favorites").delete().eq("user_id", user.id).eq("target_id", targetId);
  } else {
    const { error } = await supabase.from("favorites").insert({ user_id: user.id, target_id: targetId });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath(`/profile/${targetId}`);
  revalidatePath("/dashboard/favorites");
  return { ok: true };
}
