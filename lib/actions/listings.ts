"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { diffVariants } from "@/lib/domain/variants";
import { sendBrevoEmail, renderEmailShell } from "@/lib/brevo";
import type { ActionResult } from "./auth";
import type { PriceVariant } from "@/lib/db/types";

const variantSchema = z.object({
  attributes: z.record(z.string(), z.union([z.string(), z.number()])),
  price: z.number().positive(),
  currency: z.literal("EUR").default("EUR"),
});

const priceListingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  region_code: z.string().min(1),
  notes: z.string().optional(),
  kind: z
    .enum(["buy_from_producer", "buy_from_merchant", "sell_wholesale", "sell_retail"])
    .optional(),
  title: z.string().max(120).optional(),
  variants: z.array(variantSchema).min(1, "Απαιτείται τουλάχιστον μία τιμή"),
});

export async function savePriceListing(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = priceListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!me || (me.role !== "merchant" && me.role !== "factory")) {
    return { ok: false, error: "Μόνο έμποροι/εργοστάσια μπορούν να καταχωρήσουν τιμοκατάλογο" };
  }

  const payload = {
    owner_id: user.id,
    product_id: parsed.data.product_id,
    region_code: parsed.data.region_code,
    notes: parsed.data.notes ?? null,
    kind: parsed.data.kind ?? "buy_from_producer",
    title: parsed.data.title ?? null,
    variants: parsed.data.variants,
    is_active: true,
  };

  if (parsed.data.id) {
    // Fetch existing to compute variant diff for notifications
    const { data: existing } = await supabase
      .from("price_listings")
      .select("variants, owner_id, product_id")
      .eq("id", parsed.data.id)
      .single();
    if (!existing || existing.owner_id !== user.id) {
      return { ok: false, error: "Δεν βρέθηκε ή δεν επιτρέπεται" };
    }

    const { error } = await supabase.from("price_listings").update(payload).eq("id", parsed.data.id);
    if (error) return { ok: false, error: error.message };

    const changes = diffVariants(
      (existing.variants ?? []) as PriceVariant[],
      parsed.data.variants,
    );
    if (changes.length > 0) {
      await notifyFavoriters(user.id, parsed.data.id, parsed.data.product_id, changes);
    }

    revalidatePath(`/profile/${user.id}`);
    revalidatePath("/dashboard/listings");
    return { ok: true, id: parsed.data.id };
  }

  const { data: created, error } = await supabase
    .from("price_listings")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Fire off "new better price" scan (best-effort; runs synchronously in dev)
  try {
    await notifyNewBetterPrice(
      user.id,
      created.id,
      parsed.data.product_id,
      parsed.data.variants,
      parsed.data.region_code,
    );
  } catch (e) {
    console.error("[notifyNewBetterPrice]", e);
  }

  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard/listings");
  return { ok: true, id: created.id };
}

async function notifyFavoriters(
  ownerId: string,
  listingId: string,
  productId: string,
  changes: ReturnType<typeof diffVariants>,
) {
  const service = createSupabaseService();
  const { data: favs } = await service.from("favorites").select("user_id").eq("target_id", ownerId);
  if (!favs || favs.length === 0) return;

  const rows = favs.map((f: any) => ({
    user_id: f.user_id,
    kind: "price_changed" as const,
    payload: {
      listing_id: listingId,
      target_profile_id: ownerId,
      product_id: productId,
      changed_variants: changes,
    },
  }));
  await service.from("notifications").insert(rows);

  // Best-effort email delivery via Brevo
  const [{ data: owner }, { data: product }] = await Promise.all([
    service.from("profiles").select("display_name").eq("id", ownerId).single(),
    service.from("products").select("name_el, unit").eq("id", productId).single(),
  ]);
  const rows2html = changes
    .map(
      (c) =>
        `<li>${Object.entries(c.attributes).map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`).join(", ")}: <s>${c.old_price.toFixed(2)}€</s> → <b>${c.new_price.toFixed(2)}€/${escapeHtml((product as any)?.unit ?? "")}</b></li>`,
    )
    .join("");
  for (const f of favs) {
    const { data: userRow } = await service.auth.admin.getUserById(f.user_id);
    const email = userRow?.user?.email;
    if (!email) continue;
    await sendBrevoEmail("price_changed", {
      to: [{ email }],
      subject: `AGROTIK · Αλλαγή τιμής σε ${(owner as any)?.display_name ?? "αγαπημένο"}`,
      htmlContent: renderEmailShell(
        `Νέα τιμή σε ${(owner as any)?.display_name ?? "αγαπημένο"}`,
        `<p>${(product as any)?.name_el ?? ""}</p><ul>${rows2html}</ul>`,
      ),
      tag: "price_changed",
    });
  }
}

async function notifyNewBetterPrice(
  ownerId: string,
  listingId: string,
  productId: string,
  variants: PriceVariant[],
  regionCode: string,
) {
  const svc = createSupabaseService();
  // Find current best price for the same product in the same region
  const { data: existing } = await svc
    .from("price_listings")
    .select("owner_id, variants")
    .eq("product_id", productId)
    .eq("region_code", regionCode)
    .eq("is_active", true)
    .neq("id", listingId);

  const priorMin = (existing ?? [])
    .flatMap((row: any) => (row.variants ?? []).map((v: any) => Number(v.price)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .reduce((min: number, p: number) => Math.min(min, p), Number.POSITIVE_INFINITY);
  const newMin = variants
    .map((v) => Number(v.price))
    .filter((n) => n > 0)
    .reduce((min, p) => Math.min(min, p), Number.POSITIVE_INFINITY);
  if (!isFinite(priorMin) || newMin >= priorMin) return;

  // Farmers whose favorites are already in the region but not on this new owner
  const { data: farmers } = await svc
    .from("profiles")
    .select("id")
    .eq("role", "farmer")
    .eq("region_code", regionCode)
    .eq("is_active", true);

  if (!farmers || farmers.length === 0) return;

  const rows = farmers.map((f: any) => ({
    user_id: f.id,
    kind: "new_better_price" as const,
    payload: {
      listing_id: listingId,
      target_profile_id: ownerId,
      product_id: productId,
      changed_variants: [{ attributes: {}, old_price: priorMin, new_price: newMin }],
    },
  }));
  await svc.from("notifications").insert(rows);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

export async function deletePriceListing(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error } = await supabase.from("price_listings").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

const productionListingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  region_code: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().optional(),
  attributes: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  available_from: z.string().nullable().optional(),
  available_until: z.string().nullable().optional(),
});

export async function saveProductionListing(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = productionListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "farmer") return { ok: false, error: "Μόνο αγρότες μπορούν να καταχωρήσουν παραγωγή" };

  const payload = {
    owner_id: user.id,
    product_id: parsed.data.product_id,
    region_code: parsed.data.region_code,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit ?? null,
    attributes: parsed.data.attributes ?? {},
    available_from: parsed.data.available_from ?? null,
    available_until: parsed.data.available_until ?? null,
    is_active: true,
  };

  if (parsed.data.id) {
    const { error } = await supabase
      .from("production_listings")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("owner_id", user.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/dashboard/listings");
    revalidatePath(`/profile/${user.id}`);
    return { ok: true, id: parsed.data.id };
  }

  const { data: created, error } = await supabase
    .from("production_listings")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, id: created.id };
}

export async function deleteProductionListing(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error } = await supabase.from("production_listings").delete().eq("id", id).eq("owner_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
