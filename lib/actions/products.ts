"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const proposalSchema = z.object({
  name_el: z.string().trim().min(2, "Γράψε το όνομα του προϊόντος").max(100),
  category: z.string().trim().min(2, "Γράψε την κατηγορία").max(80),
  unit: z.string().trim().min(1, "Γράψε τη μονάδα μέτρησης").max(30),
});

export async function proposeProduct(formData: FormData): Promise<ActionResult> {
  const parsed = proposalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active, role")
    .eq("id", user.id)
    .single();
  if (!profile?.is_active || profile.role === "admin") {
    return { ok: false, error: "Δεν επιτρέπεται η πρόταση προϊόντος" };
  }
  if (!(await consumeRateLimit("product-proposals", user.id, 5, 86400))) {
    return { ok: false, error: "Έχεις υποβάλει πολλές προτάσεις σήμερα. Δοκίμασε ξανά αύριο." };
  }

  const { data: sameName } = await supabase
    .from("products")
    .select("id, status")
    .ilike("name_el", parsed.data.name_el)
    .limit(1)
    .maybeSingle();
  if (sameName) {
    return {
      ok: false,
      error: sameName.status === "pending"
        ? "Το προϊόν έχει ήδη προταθεί και περιμένει έγκριση"
        : "Το προϊόν υπάρχει ήδη στον κατάλογο",
    };
  }

  const { error } = await supabase.from("products").insert({
    slug: `proposal-${Date.now()}-${randomUUID().slice(0, 8)}`,
    name_el: parsed.data.name_el,
    category: parsed.data.category,
    unit: parsed.data.unit,
    attributes_schema: {},
    status: "pending",
    proposed_by: user.id,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/products");
  return { ok: true };
}
