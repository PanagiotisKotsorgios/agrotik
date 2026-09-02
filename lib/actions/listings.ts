"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { diffVariants } from "@/lib/domain/variants";
import { attributeLabel, hasFarmerRole, hasFisherRole, isProducerRole } from "@/lib/utils";
import { sendBrevoEmail, renderEmailShell } from "@/lib/brevo";
import { getAppOrigin } from "@/lib/app-origin";
import type { ActionResult } from "./auth";
import type { PriceVariant } from "@/lib/db/types";

const attributeValueSchema = z.union([
  z.string().trim().max(120),
  z.number().finite().min(-1_000_000_000).max(1_000_000_000),
]);
const attributeMapSchema = z
  .record(z.string().regex(/^[a-zA-Z0-9_]{1,50}$/), attributeValueSchema)
  .refine((value) => Object.keys(value).length <= 20, "Υπάρχουν πάρα πολλά χαρακτηριστικά");

const variantSchema = z.object({
  attributes: attributeMapSchema,
  price: z.number().positive().max(1_000_000_000),
  currency: z.literal("EUR").default("EUR"),
});

const priceListingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  region_code: z.string().min(1).max(20),
  notes: z.string().trim().max(2000).optional(),
  kind: z
    .enum(["buy_from_producer", "buy_from_merchant", "sell_wholesale", "sell_retail"])
    .optional(),
  title: z.string().trim().max(120).optional(),
  variants: z.array(variantSchema).min(1, "Απαιτείται τουλάχιστον μία τιμή").max(50),
});

export async function savePriceListing(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = priceListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role, is_active, deleted_at").eq("id", user.id).single();
  if (!me?.is_active || me.deleted_at || (me.role !== "merchant" && me.role !== "factory")) {
    return { ok: false, error: "Μόνο έμποροι/εργοστάσια μπορούν να καταχωρήσουν τιμοκατάλογο" };
  }
  const listingKind = parsed.data.kind ?? "buy_from_producer";
  if (me.role === "merchant" && listingKind === "buy_from_merchant") {
    return { ok: false, error: "Μόνο εργοστάσια μπορούν να καταχωρήσουν αγορά από εμπόρους" };
  }
  const { data: selectedProduct } = await supabase
    .from("products")
    .select("id")
    .eq("id", parsed.data.product_id)
    .eq("status", "active")
    .maybeSingle();
  if (!selectedProduct) return { ok: false, error: "Το προϊόν δεν είναι διαθέσιμο" };

  const payload = {
    owner_id: user.id,
    product_id: parsed.data.product_id,
    region_code: parsed.data.region_code,
    notes: parsed.data.notes ?? null,
    kind: listingKind,
    title: parsed.data.title ?? null,
    variants: parsed.data.variants,
  };

  if (parsed.data.id) {
    // Fetch existing to compute variant diff for notifications
    const { data: existing } = await supabase
      .from("price_listings")
      .select("variants, owner_id, product_id, kind")
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
    if (changes.length > 0 && parsed.data.kind === "buy_from_producer") {
      await notifyFavoriters(user.id, parsed.data.id, parsed.data.product_id, changes);
    }

    revalidatePath(`/profile/${user.id}`);
    revalidatePath("/dashboard/listings");
    return { ok: true, id: parsed.data.id };
  }

  const { data: created, error } = await supabase
    .from("price_listings")
    .insert({ ...payload, is_active: true })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Fire off "new better price" scan (best-effort; runs synchronously in dev)
  if (listingKind === "buy_from_producer") {
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
        `<li>${Object.entries(c.attributes).map(([k, v]) => `${escapeHtml(attributeLabel(k))}: ${escapeHtml(String(v))}`).join(", ")}: <s>${c.old_price.toFixed(2)}€</s> → <b>${c.new_price.toFixed(2)}€/${escapeHtml((product as any)?.unit ?? "")}</b></li>`,
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
    .eq("kind", "buy_from_producer")
    .eq("is_active", true)
    .neq("id", listingId);

  const priorBest = (existing ?? [])
    .flatMap((row: any) => (row.variants ?? []).map((v: any) => Number(v.price)))
    .filter((n) => Number.isFinite(n) && n > 0)
    .reduce((max: number, p: number) => Math.max(max, p), Number.NEGATIVE_INFINITY);
  const newBest = variants
    .map((v) => Number(v.price))
    .filter((n) => n > 0)
    .reduce((max, p) => Math.max(max, p), Number.NEGATIVE_INFINITY);
  if (!isFinite(priorBest) || newBest <= priorBest) return;

  const { data: audienceProduct } = await svc
    .from("products")
    .select("category")
    .eq("id", productId)
    .single();
  const producerRoles = (audienceProduct as any)?.category === "Αλιευτικά είδη"
    ? ["fisher", "farmer_fisher"]
    : ["farmer", "farmer_fisher"];

  // Notify the matching producer audience in the same region.
  const { data: farmers } = await svc
    .from("profiles")
    .select("id")
    .in("role", producerRoles)
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
      changed_variants: [{ attributes: {}, old_price: priorBest, new_price: newBest }],
    },
  }));
  await svc.from("notifications").insert(rows);

  const [{ data: buyer }, { data: product }] = await Promise.all([
    svc.from("profiles").select("display_name").eq("id", ownerId).single(),
    svc.from("products").select("name_el, unit").eq("id", productId).single(),
  ]);
  const buyerName = (buyer as any)?.display_name ?? "νέο αγοραστή";
  const productName = (product as any)?.name_el ?? "προϊόν";
  const unit = (product as any)?.unit ?? "";
  const profileUrl = `${getAppOrigin()}/profile/${ownerId}`;

  for (const farmer of farmers) {
    const { data: userRow } = await svc.auth.admin.getUserById(farmer.id);
    const email = userRow?.user?.email;
    if (!email) continue;
    const emailResult = await sendBrevoEmail("new_better_price", {
      to: [{ email }],
      subject: `AGROTIK · Νέα καλύτερη τιμή για ${productName}`,
      htmlContent: renderEmailShell(
        "Νέος αγοραστής με καλύτερη τιμή",
        `<p>Ο <strong>${escapeHtml(buyerName)}</strong> καταχώρησε νέα τιμή για <strong>${escapeHtml(productName)}</strong>.</p>
         <p>Νέα τιμή: <strong>${newBest.toFixed(2)}€/${escapeHtml(unit)}</strong></p>
         <p><a href="${profileUrl}" style="color:#1B4D2E;font-weight:600">Δες το προφίλ του αγοραστή</a></p>`,
      ),
      tag: "new_better_price",
    });
    if (!emailResult.ok) console.error("[new better price email]", emailResult.error);
  }
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

export async function deletePriceListing(id: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη καταχώρηση" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data, error } = await supabase.from("price_listings").delete().eq("id", parsedId.data).eq("owner_id", user.id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Η καταχώρηση δεν βρέθηκε" };
  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

export async function setPriceListingActive(id: string, isActive: boolean): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη καταχώρηση" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data, error } = await supabase
    .from("price_listings")
    .update({ is_active: isActive })
    .eq("id", parsedId.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Η καταχώρηση δεν βρέθηκε" };

  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

const productionListingSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid(),
  region_code: z.string().min(1).max(20),
  quantity: z.number().positive().max(1_000_000_000_000),
  unit: z.string().trim().max(50).optional(),
  attributes: attributeMapSchema.optional(),
  available_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  available_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
  title: z.string().trim().max(120).optional(),
}).refine(
  (value) => !value.available_from || !value.available_until || value.available_from <= value.available_until,
  { message: "Η ημερομηνία λήξης πρέπει να είναι μετά την ημερομηνία έναρξης", path: ["available_until"] },
);

export async function saveProductionListing(input: unknown): Promise<ActionResult & { id?: string }> {
  const parsed = productionListingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data: me } = await supabase.from("profiles").select("role, is_active, deleted_at").eq("id", user.id).single();
  if (!me?.is_active || me.deleted_at || !isProducerRole(me.role)) {
    return { ok: false, error: "Μόνο αγρότες και αλιείς μπορούν να κάνουν καταχώρηση παραγωγής" };
  }

  const { data: selectedProduct } = await supabase
    .from("products")
    .select("category, status")
    .eq("id", parsed.data.product_id)
    .eq("status", "active")
    .single();
  if (!selectedProduct) return { ok: false, error: "Το προϊόν δεν είναι διαθέσιμο" };
  const isSeafood = selectedProduct.category === "Αλιευτικά είδη";
  if (!hasFarmerRole(me.role) && !isSeafood) {
    return { ok: false, error: "Οι αλιείς μπορούν να καταχωρούν μόνο αλιευτικά είδη" };
  }
  if (!hasFisherRole(me.role) && isSeafood) {
    return { ok: false, error: "Τα αλιευτικά είδη καταχωρούνται από λογαριασμό αλιέα" };
  }

  const payload = {
    owner_id: user.id,
    product_id: parsed.data.product_id,
    region_code: parsed.data.region_code,
    quantity: parsed.data.quantity,
    unit: parsed.data.unit ?? null,
    attributes: parsed.data.attributes ?? {},
    available_from: parsed.data.available_from ?? null,
    available_until: parsed.data.available_until ?? null,
    notes: parsed.data.notes ?? null,
    title: parsed.data.title ?? null,
  };

  if (parsed.data.id) {
    const { data, error } = await supabase
      .from("production_listings")
      .update(payload)
      .eq("id", parsed.data.id)
      .eq("owner_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: "Η καταχώρηση δεν βρέθηκε" };
    revalidatePath("/dashboard/listings");
    revalidatePath(`/profile/${user.id}`);
    return { ok: true, id: parsed.data.id };
  }

  const { data: created, error } = await supabase
    .from("production_listings")
    .insert({ ...payload, is_active: true })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true, id: created.id };
}

export async function deleteProductionListing(id: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη καταχώρηση" };
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data, error } = await supabase.from("production_listings").delete().eq("id", parsedId.data).eq("owner_id", user.id).select("id").maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Η καταχώρηση δεν βρέθηκε" };
  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

export async function setProductionListingActive(id: string, isActive: boolean): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη καταχώρηση" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { data, error } = await supabase
    .from("production_listings")
    .update({ is_active: isActive })
    .eq("id", parsedId.data)
    .eq("owner_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Η καταχώρηση δεν βρέθηκε" };

  revalidatePath("/dashboard/listings");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
