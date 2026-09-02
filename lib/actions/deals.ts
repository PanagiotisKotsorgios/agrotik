"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { isProducerRole } from "@/lib/utils";
import type { ActionResult } from "./auth";

const dealSchema = z.object({
  target_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
});

export async function recordDeal(input: unknown): Promise<ActionResult> {
  const parsed = dealSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Μη έγκυρη συμφωνία" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const [{ data: producer }, { data: buyer }] = await Promise.all([
    supabase.from("profiles").select("role, is_active").eq("id", user.id).single(),
    supabase
      .from("profiles")
      .select("role, is_active")
      .eq("id", parsed.data.target_id)
      .maybeSingle(),
  ]);
  if (!producer?.is_active || !isProducerRole(producer.role)) {
    return { ok: false, error: "Μόνο παραγωγοί και αλιείς μπορούν να καταγράψουν πώληση" };
  }
  if (!buyer?.is_active || (buyer.role !== "merchant" && buyer.role !== "factory")) {
    return { ok: false, error: "Ο αγοραστής δεν είναι διαθέσιμος" };
  }

  if (parsed.data.product_id) {
    const { data: listing } = await supabase
      .from("price_listings")
      .select("id")
      .eq("owner_id", parsed.data.target_id)
      .eq("product_id", parsed.data.product_id)
      .eq("kind", "buy_from_producer")
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();
    if (!listing) return { ok: false, error: "Το προϊόν δεν είναι διαθέσιμο από αυτόν τον αγοραστή" };
  }

  let existing = supabase
    .from("deal_marks")
    .select("id")
    .eq("farmer_id", user.id)
    .eq("target_id", parsed.data.target_id);
  existing = parsed.data.product_id
    ? existing.eq("product_id", parsed.data.product_id)
    : existing.is("product_id", null);
  const { data: existingDeal } = await existing.limit(1).maybeSingle();
  if (existingDeal) return { ok: true };

  const { error } = await supabase.from("deal_marks").insert({
    farmer_id: user.id,
    target_id: parsed.data.target_id,
    product_id: parsed.data.product_id ?? null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/network");
  revalidatePath(`/profile/${parsed.data.target_id}`);
  return { ok: true };
}
