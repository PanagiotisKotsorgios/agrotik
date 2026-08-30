import { createSupabaseServer } from "@/lib/supabase/server";
import { bestVariant } from "@/lib/domain/variants";
import type {
  PriceListing,
  ProductionListing,
  Product,
  Profile,
  Region,
} from "@/lib/db/types";

export interface BuyerCard {
  profile: Pick<Profile, "id" | "display_name" | "region_code" | "role" | "avatar_path">;
  region_name: string;
  municipality?: string | null;
  product: Pick<Product, "id" | "name_el" | "unit" | "category">;
  best_price: number | null;
  best_attributes: Record<string, string | number> | null;
  updated_at: string;
}

export interface ProducerCard {
  profile: Pick<Profile, "id" | "display_name" | "region_code" | "role" | "avatar_path">;
  region_name: string;
  municipality?: string | null;
  product: Pick<Product, "id" | "name_el" | "unit" | "category">;
  quantity: number;
  unit: string;
  attributes: Record<string, string | number>;
  available_from: string | null;
  available_until: string | null;
  updated_at: string;
}

export interface BuyerFilters {
  product_id?: string;
  product_category?: string;
  region_code?: string;
  municipality?: string;
  attributes?: Record<string, string>;
  number_attrs?: Record<string, { min?: number; max?: number }>;
  price_min?: number;
  price_max?: number;
  buyer_type?: Array<"merchant" | "factory">;
  name?: string;
  sort?: "price_asc" | "price_desc" | "updated";
}

export interface ProducerFilters {
  product_id?: string;
  product_category?: string;
  region_code?: string;
  municipality?: string;
  attributes?: Record<string, string>;
  number_attrs?: Record<string, { min?: number; max?: number }>;
  quantity_min?: number;
  quantity_max?: number;
  date?: string;
  name?: string;
  sort?: "quantity_desc" | "quantity_asc" | "updated";
}

function attributesMatch(
  target: Record<string, any>,
  filter: Record<string, string> | undefined,
  numberFilter: Record<string, { min?: number; max?: number }> | undefined,
): boolean {
  if (filter) {
    for (const [k, v] of Object.entries(filter)) {
      if (!v) continue;
      if (String(target[k] ?? "") !== v) return false;
    }
  }
  if (numberFilter) {
    for (const [k, range] of Object.entries(numberFilter)) {
      const n = Number(target[k]);
      if (Number.isFinite(n)) {
        if (range.min !== undefined && n < range.min) return false;
        if (range.max !== undefined && n > range.max) return false;
      } else if (range.min !== undefined || range.max !== undefined) {
        return false;
      }
    }
  }
  return true;
}

export async function searchBuyers(filters: BuyerFilters): Promise<BuyerCard[]> {
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("price_listings")
    .select(
      `id, owner_id, product_id, variants, region_code, updated_at,
       products!inner(id, name_el, unit, category, status),
       profiles!inner(id, display_name, region_code, role, avatar_path, municipality, is_active, is_public, deleted_at),
       regions(name_el)`,
    )
    .eq("is_active", true)
    .eq("products.status", "active")
    .eq("profiles.is_active", true)
    .in("profiles.role", filters.buyer_type ?? ["merchant", "factory"])
    .limit(500);

  if (filters.product_id) query = query.eq("product_id", filters.product_id);
  if (filters.product_category) query = query.eq("products.category", filters.product_category);
  if (filters.region_code) query = query.eq("region_code", filters.region_code);
  if (filters.municipality) {
    query = query.ilike("profiles.municipality", `%${filters.municipality}%`);
  }
  if (filters.name) {
    query = query.ilike("profiles.display_name", `%${filters.name}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[searchBuyers]", error);
    return [];
  }

  const byOwner = new Map<string, BuyerCard>();
  for (const row of (data ?? []) as any[]) {
    // Filter variants by all attribute / number filters and price range
    const candidates = (row.variants ?? []).filter((v: any) => {
      if (!attributesMatch(v.attributes ?? {}, filters.attributes, filters.number_attrs)) return false;
      const p = Number(v.price);
      if (!Number.isFinite(p)) return false;
      if (filters.price_min !== undefined && p < filters.price_min) return false;
      if (filters.price_max !== undefined && p > filters.price_max) return false;
      return true;
    });
    if (candidates.length === 0) continue;
    const best = candidates.reduce((a: any, b: any) => (Number(a.price) <= Number(b.price) ? a : b));
    const existing = byOwner.get(row.owner_id);
    if (!existing || (existing.best_price ?? Infinity) > Number(best.price)) {
      byOwner.set(row.owner_id, {
        profile: row.profiles,
        region_name: row.regions?.name_el ?? row.region_code,
        municipality: row.profiles?.municipality ?? null,
        product: row.products,
        best_price: Number(best.price),
        best_attributes: best.attributes,
        updated_at: row.updated_at,
      });
    }
  }

  const cards = [...byOwner.values()];
  switch (filters.sort) {
    case "price_desc":
      cards.sort((a, b) => (b.best_price ?? -Infinity) - (a.best_price ?? -Infinity));
      break;
    case "updated":
      cards.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      break;
    case "price_asc":
    default:
      cards.sort((a, b) => (a.best_price ?? Infinity) - (b.best_price ?? Infinity));
  }
  return cards;
}

export async function searchProducers(filters: ProducerFilters): Promise<ProducerCard[]> {
  const supabase = await createSupabaseServer();

  let query = supabase
    .from("production_listings")
    .select(
      `id, owner_id, product_id, attributes, quantity, unit, region_code,
       available_from, available_until, updated_at,
       products!inner(id, name_el, unit, category, status),
       profiles!inner(id, display_name, region_code, role, avatar_path, municipality, is_active, is_public, deleted_at),
       regions(name_el)`,
    )
    .eq("is_active", true)
    .eq("products.status", "active")
    .eq("profiles.is_active", true)
    .eq("profiles.is_public", true)
    .eq("profiles.role", "farmer")
    .limit(500);

  if (filters.product_id) query = query.eq("product_id", filters.product_id);
  if (filters.product_category) query = query.eq("products.category", filters.product_category);
  if (filters.region_code) query = query.eq("region_code", filters.region_code);
  if (filters.municipality) query = query.ilike("profiles.municipality", `%${filters.municipality}%`);
  if (filters.name) query = query.ilike("profiles.display_name", `%${filters.name}%`);
  if (filters.quantity_min) query = query.gte("quantity", filters.quantity_min);
  if (filters.quantity_max) query = query.lte("quantity", filters.quantity_max);
  if (filters.date) {
    query = query
      .or(`available_from.is.null,available_from.lte.${filters.date}`)
      .or(`available_until.is.null,available_until.gte.${filters.date}`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[searchProducers]", error);
    return [];
  }

  const rows = ((data ?? []) as any[]).filter((row) =>
    attributesMatch(row.attributes ?? {}, filters.attributes, filters.number_attrs),
  );

  const cards = rows.map((row) => ({
    profile: row.profiles,
    region_name: row.regions?.name_el ?? row.region_code,
    municipality: row.profiles?.municipality ?? null,
    product: row.products,
    quantity: Number(row.quantity),
    unit: row.unit ?? row.products.unit,
    attributes: row.attributes ?? {},
    available_from: row.available_from,
    available_until: row.available_until,
    updated_at: row.updated_at,
  }));

  switch (filters.sort) {
    case "quantity_desc":
      cards.sort((a, b) => b.quantity - a.quantity);
      break;
    case "quantity_asc":
      cards.sort((a, b) => a.quantity - b.quantity);
      break;
    case "updated":
    default:
      cards.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }
  return cards;
}

export async function getRegions(): Promise<Region[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("regions").select("code, name_el").order("name_el");
  return (data as Region[]) ?? [];
}

export async function getActiveProducts(): Promise<Product[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("status", "active")
    .order("category", { ascending: true })
    .order("name_el", { ascending: true });
  return (data as Product[]) ?? [];
}

export async function getProductCategories(): Promise<string[]> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("products").select("category").eq("status", "active");
  const set = new Set<string>();
  for (const row of (data as any[]) ?? []) set.add(row.category);
  return [...set].sort();
}

export async function getProfileById(id: string) {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.from("profiles").select("*, regions(name_el)").eq("id", id).single();
  return data;
}

export async function getProfileListings(profileId: string, role: string) {
  const supabase = await createSupabaseServer();
  if (role === "merchant" || role === "factory") {
    const { data } = await supabase
      .from("price_listings")
      .select("*, products(name_el, unit, attributes_schema), regions(name_el)")
      .eq("owner_id", profileId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });
    return { type: "price" as const, listings: (data as any[]) ?? [] };
  }
  const { data } = await supabase
    .from("production_listings")
    .select("*, products(name_el, unit), regions(name_el)")
    .eq("owner_id", profileId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });
  return { type: "production" as const, listings: (data as any[]) ?? [] };
}
