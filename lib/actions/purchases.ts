"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const purchaseSchema = z.object({
  id: z.string().uuid().optional(),
  farmer_id: z.string().uuid("Επίλεξε παραγωγό"),
  product_id: z.string().uuid("Επίλεξε προϊόν"),
  season: z.string().min(1, "Απαιτείται σεζόν"),
  quantity: z.coerce.number().positive("Απαιτείται ποσότητα"),
  unit: z.string().min(1),
  price_per_unit: z.coerce.number().optional(),
  purchased_at: z.string().optional(),
  notes: z.string().optional(),
});

async function requireBuyer() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "merchant" && data?.role !== "factory") return null;
  return { user, supabase };
}

export async function savePurchase(formData: FormData): Promise<ActionResult> {
  const parsed = purchaseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };
  const ctx = await requireBuyer();
  if (!ctx) return { ok: false, error: "Μόνο έμποροι/εργοστάσια μπορούν να καταχωρήσουν αγορές" };

  const row = {
    buyer_id: ctx.user.id,
    farmer_id: parsed.data.farmer_id,
    product_id: parsed.data.product_id,
    season: parsed.data.season,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit,
    price_per_unit: Number.isFinite(parsed.data.price_per_unit) ? parsed.data.price_per_unit : null,
    purchased_at: parsed.data.purchased_at || new Date().toISOString().slice(0, 10),
    notes: parsed.data.notes || null,
  };

  if (parsed.data.id) {
    const { error } = await ctx.supabase.from("purchases").update(row).eq("id", parsed.data.id).eq("buyer_id", ctx.user.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await ctx.supabase.from("purchases").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/purchases");
  return { ok: true };
}

export async function deletePurchase(id: string): Promise<ActionResult> {
  const ctx = await requireBuyer();
  if (!ctx) return { ok: false, error: "Δεν επιτρέπεται" };
  const { error } = await ctx.supabase.from("purchases").delete().eq("id", id).eq("buyer_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/purchases");
  return { ok: true };
}
