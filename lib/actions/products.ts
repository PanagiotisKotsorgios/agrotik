"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const slugPattern = /^[a-z0-9][a-z0-9_-]{1,80}$/;

const attributeMetaSchema = z.object({
  type: z.enum(["text", "number", "enum"]).default("text"),
  label: z.string().min(1).max(80),
  values: z.array(z.string().min(1).max(80)).max(50).optional(),
  unit: z.string().max(20).optional(),
});

const newProductSchema = z.object({
  name_el: z.string().trim().min(2, "Δώσε ένα όνομα").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(slugPattern, "Slug: μικρά γράμματα, αριθμοί, - ή _"),
  category: z.string().trim().min(2, "Επίλεξε ή γράψε κατηγορία").max(80),
  unit: z.string().trim().min(1, "Δώσε μονάδα (κιλό, λίτρο, τεμάχιο …)").max(20),
  attributes_schema: z.record(z.string(), attributeMetaSchema).optional(),
});

/**
 * A supplier or producer proposes a new product. It becomes active
 * immediately (per platform policy — admin reviews after the fact).
 * Rate-limited by RLS + slug uniqueness at the DB level.
 */
export async function createSupplierProduct(input: unknown): Promise<
  ActionResult & { id?: string; slug?: string }
> {
  const parsed = newProductSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  }
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const allowedRoles = new Set([
    "farmer",
    "fisher",
    "farmer_fisher",
    "stockbreeder",
    "beekeeper",
    "farmer_stockbreeder",
    "farmer_beekeeper",
    "agri_supplier",
  ]);
  if (!me || !allowedRoles.has(me.role)) {
    return { ok: false, error: "Δεν έχεις δικαίωμα να προσθέσεις προϊόν" };
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      slug: parsed.data.slug,
      name_el: parsed.data.name_el,
      category: parsed.data.category,
      unit: parsed.data.unit,
      attributes_schema: parsed.data.attributes_schema ?? {},
      status: "active",
      proposed_by: user.id,
    })
    .select("id, slug")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "Υπάρχει ήδη προϊόν με αυτό το slug. Δοκίμασε ένα διαφορετικό.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/listings");
  revalidatePath("/admin/products");
  return { ok: true, id: data.id, slug: data.slug };
}

/**
 * Proposer removes their own catalogue entry. RLS refuses if the
 * product is referenced by any listing/purchase.
 */
export async function deleteMyProduct(id: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρο προϊόν" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data, error } = await supabase
    .from("products")
    .delete()
    .eq("id", parsedId.data)
    .eq("proposed_by", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Το προϊόν δεν βρέθηκε ή χρησιμοποιείται ήδη σε καταχωρήσεις.",
    };
  }
  revalidatePath("/dashboard/listings");
  revalidatePath("/admin/products");
  return { ok: true };
}

/** Admin-only permanent delete (bypasses proposer check via RLS). */
export async function adminDeleteProduct(id: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρο προϊόν" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const { error } = await supabase.from("products").delete().eq("id", parsedId.data);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}
