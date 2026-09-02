"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const optionalPrice = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().nonnegative("Η τιμή δεν μπορεί να είναι αρνητική").optional(),
);

const purchaseSchema = z.object({
  id: z.string().uuid().optional(),
  farmer_id: z.string().uuid("Επίλεξε παραγωγό ή αλιέα"),
  product_id: z.string().uuid("Επίλεξε προϊόν"),
  season: z.string().trim().min(1, "Απαιτείται σεζόν").max(30),
  quantity: z.coerce.number().positive("Απαιτείται ποσότητα"),
  unit: z.string().trim().min(1).max(50),
  price_per_unit: optionalPrice,
  purchased_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Μη έγκυρη ημερομηνία").optional(),
  notes: z.string().trim().max(2000).optional(),
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

  const [{ data: producer }, { data: product }] = await Promise.all([
    ctx.supabase
      .from("profiles")
      .select("id")
      .eq("id", parsed.data.farmer_id)
      .in("role", ["farmer", "fisher", "farmer_fisher"])
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle(),
    ctx.supabase
      .from("products")
      .select("id")
      .eq("id", parsed.data.product_id)
      .eq("status", "active")
      .maybeSingle(),
  ]);
  if (!producer) return { ok: false, error: "Ο παραγωγός ή αλιέας δεν είναι διαθέσιμος" };
  if (!product) return { ok: false, error: "Το προϊόν δεν είναι διαθέσιμο" };

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
    const { data, error } = await ctx.supabase
      .from("purchases")
      .update(row)
      .eq("id", parsed.data.id)
      .eq("buyer_id", ctx.user.id)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Η αγορά δεν βρέθηκε" };
  } else {
    const { error } = await ctx.supabase.from("purchases").insert(row);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard/purchases");
  return { ok: true };
}

export async function deletePurchase(id: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη αγορά" };
  const ctx = await requireBuyer();
  if (!ctx) return { ok: false, error: "Δεν επιτρέπεται" };
  const { data, error } = await ctx.supabase
    .from("purchases")
    .delete()
    .eq("id", parsedId.data)
    .eq("buyer_id", ctx.user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Η αγορά δεν βρέθηκε" };
  revalidatePath("/dashboard/purchases");
  return { ok: true };
}
