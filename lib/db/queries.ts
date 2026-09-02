import { createSupabaseServer } from "@/lib/supabase/server";
import type {
  Product,
  Profile,
  Region,
} from "@/lib/db/types";

export interface BuyerCard {
  profile: Pick<Profile, "id" | "display_name" | "region_code" | "role" | "avatar_url" | "bio">;
  region_name: string;
  municipality?: string | null;
  // Nullable when this profile has no active price listing yet
  product: Pick<Product, "id" | "name_el" | "unit" | "category"> | null;
  best_price: number | null;
  best_attributes: Record<string, string | number> | null;
  updated_at: string;
  has_listing: boolean;
}

export interface ProducerCard {
  profile: Pick<Profile, "id" | "display_name" | "region_code" | "role" | "avatar_url" | "bio">;
  region_name: string;
  municipality?: string | null;
  // Nullable when this farmer has no production listing yet
  product: Pick<Product, "id" | "name_el" | "unit" | "category"> | null;
  quantity: number | null;
  unit: string | null;
  attributes: Record<string, string | number>;
  available_from: string | null;
  available_until: string | null;
  updated_at: string;
  has_listing: boolean;
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
  producer_type?: "farmer" | "fisher";
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
      const targetValue = String(target[k] ?? "").trim().toLocaleLowerCase("el-GR");
      const filterValue = v.trim().toLocaleLowerCase("el-GR");
      if (!targetValue.includes(filterValue)) return false;
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

  const roles = filters.buyer_type ?? ["merchant", "factory"];
  const hasListingFilter =
    filters.product_id !== undefined ||
    filters.product_category !== undefined ||
    filters.price_min !== undefined ||
    filters.price_max !== undefined ||
    (filters.attributes && Object.keys(filters.attributes).length > 0) ||
    (filters.number_attrs && Object.keys(filters.number_attrs).length > 0);

  // 1. Base: fetch matching profiles (all merchants/factories with filters).
  let profQ = supabase
    .from("profiles")
    .select(
      "id, display_name, region_code, role, avatar_url, bio, municipality, is_active, is_public, updated_at, regions(name_el)",
    )
    .eq("is_active", true)
    .eq("is_public", true)
    .neq("role", "admin")
    .in("role", roles)
    .is("deleted_at", null)
    .limit(500);

  if (filters.region_code) profQ = profQ.eq("region_code", filters.region_code);
  if (filters.municipality) profQ = profQ.ilike("municipality", `%${filters.municipality}%`);
  if (filters.name) profQ = profQ.ilike("display_name", `%${filters.name}%`);

  const { data: profs, error: profErr } = await profQ;
  if (profErr) {
    console.error("[searchBuyers profiles]", profErr);
    return [];
  }

  // 2. Fetch matching listings for these profiles' owners.
  const ownerIds = (profs ?? []).map((p: any) => p.id);
  let listings: any[] = [];
  if (ownerIds.length > 0) {
    let lstQ = supabase
      .from("price_listings")
      .select(
        `owner_id, product_id, kind, variants, updated_at,
         products!inner(id, name_el, unit, category, status)`,
      )
      .in("owner_id", ownerIds)
      .eq("is_active", true)
      .eq("kind", "buy_from_producer")
      .eq("products.status", "active")
      .limit(2000);
    if (filters.product_id) lstQ = lstQ.eq("product_id", filters.product_id);
    if (filters.product_category) lstQ = lstQ.eq("products.category", filters.product_category);
    const { data: lst } = await lstQ;
    listings = (lst ?? []) as any[];
  }

  // 3. Bucket listings by owner and pick the best matching variant.
  const bestByOwner = new Map<
    string,
    { product: any; best_price: number; best_attributes: any; updated_at: string }
  >();
  for (const row of listings) {
    const candidates = (row.variants ?? []).filter((v: any) => {
      if (!attributesMatch(v.attributes ?? {}, filters.attributes, filters.number_attrs)) return false;
      const p = Number(v.price);
      if (!Number.isFinite(p)) return false;
      if (filters.price_min !== undefined && p < filters.price_min) return false;
      if (filters.price_max !== undefined && p > filters.price_max) return false;
      return true;
    });
    if (candidates.length === 0) continue;
    const best = candidates.reduce((a: any, b: any) =>
      Number(a.price) >= Number(b.price) ? a : b,
    );
    const existing = bestByOwner.get(row.owner_id);
    if (!existing || existing.best_price < Number(best.price)) {
      bestByOwner.set(row.owner_id, {
        product: row.products,
        best_price: Number(best.price),
        best_attributes: best.attributes,
        updated_at: row.updated_at,
      });
    }
  }

  // 4. Build one card per profile. If a listing-derived filter is active,
  //    drop profiles that have no matching listing; otherwise keep them
  //    all and show 'χωρίς καταχώρηση' in the card.
  const cards: BuyerCard[] = [];
  for (const p of (profs ?? []) as any[]) {
    const match = bestByOwner.get(p.id);
    if (hasListingFilter && !match) continue;
    cards.push({
      profile: {
        id: p.id,
        display_name: p.display_name,
        region_code: p.region_code,
        role: p.role,
        avatar_url: p.avatar_url,
        bio: p.bio,
      },
      region_name: p.regions?.name_el ?? p.region_code,
      municipality: p.municipality ?? null,
      product: match?.product ?? null,
      best_price: match?.best_price ?? null,
      best_attributes: match?.best_attributes ?? null,
      updated_at: match?.updated_at ?? p.updated_at,
      has_listing: Boolean(match),
    });
  }

  switch (filters.sort) {
    case "price_desc":
      cards.sort((a, b) => (b.best_price ?? -Infinity) - (a.best_price ?? -Infinity));
      break;
    case "updated":
      cards.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
      break;
    case "price_asc":
      cards.sort((a, b) => {
        if (a.has_listing !== b.has_listing) return a.has_listing ? -1 : 1;
        return (a.best_price ?? Infinity) - (b.best_price ?? Infinity);
      });
      break;
    case "price_desc":
    default:
      cards.sort((a, b) => {
        // A buyer's purchase price is an offer to the producer, so higher is better.
        if (a.has_listing !== b.has_listing) return a.has_listing ? -1 : 1;
        return (b.best_price ?? -Infinity) - (a.best_price ?? -Infinity);
      });
  }
  return cards;
}

export async function searchProducers(filters: ProducerFilters): Promise<ProducerCard[]> {
  const supabase = await createSupabaseServer();
  const roles = filters.producer_type === "farmer"
    ? ["farmer", "farmer_fisher"]
    : filters.producer_type === "fisher"
      ? ["fisher", "farmer_fisher"]
      : ["farmer", "fisher", "farmer_fisher"];

  const hasListingFilter =
    filters.product_id !== undefined ||
    filters.product_category !== undefined ||
    filters.quantity_min !== undefined ||
    filters.quantity_max !== undefined ||
    filters.date !== undefined ||
    (filters.attributes && Object.keys(filters.attributes).length > 0) ||
    (filters.number_attrs && Object.keys(filters.number_attrs).length > 0);

  // 1. Fetch all producer profiles (farmers/fishers, public + active).
  let profQ = supabase
    .from("profiles")
    .select(
      "id, display_name, region_code, role, avatar_url, bio, municipality, is_active, is_public, updated_at, regions(name_el)",
    )
    .eq("is_active", true)
    .eq("is_public", true)
    .in("role", roles)
    .is("deleted_at", null)
    .limit(500);

  if (filters.region_code) profQ = profQ.eq("region_code", filters.region_code);
  if (filters.municipality) profQ = profQ.ilike("municipality", `%${filters.municipality}%`);
  if (filters.name) profQ = profQ.ilike("display_name", `%${filters.name}%`);

  const { data: profs, error: profErr } = await profQ;
  if (profErr) {
    console.error("[searchProducers profiles]", profErr);
    return [];
  }

  // 2. Fetch matching production listings.
  const ownerIds = (profs ?? []).map((p: any) => p.id);
  let listings: any[] = [];
  if (ownerIds.length > 0) {
    let lstQ = supabase
      .from("production_listings")
      .select(
        `owner_id, product_id, attributes, quantity, unit, available_from, available_until, updated_at,
         products!inner(id, name_el, unit, category, status)`,
      )
      .in("owner_id", ownerIds)
      .eq("is_active", true)
      .eq("products.status", "active")
      .limit(2000);
    if (filters.product_id) lstQ = lstQ.eq("product_id", filters.product_id);
    if (filters.product_category) lstQ = lstQ.eq("products.category", filters.product_category);
    if (filters.producer_type === "fisher") lstQ = lstQ.eq("products.category", "Αλιευτικά είδη");
    if (filters.producer_type === "farmer") lstQ = lstQ.neq("products.category", "Αλιευτικά είδη");
    if (filters.quantity_min) lstQ = lstQ.gte("quantity", filters.quantity_min);
    if (filters.quantity_max) lstQ = lstQ.lte("quantity", filters.quantity_max);
    const availabilityDate = filters.date ?? new Date().toISOString().slice(0, 10);
    lstQ = lstQ
      .or(`available_from.is.null,available_from.lte.${availabilityDate}`)
      .or(`available_until.is.null,available_until.gte.${availabilityDate}`);
    const { data: lst } = await lstQ;
    listings = ((lst ?? []) as any[]).filter((row) =>
      attributesMatch(row.attributes ?? {}, filters.attributes, filters.number_attrs),
    );
  }

  // 3. Pick the most recent matching listing per owner.
  const bestByOwner = new Map<string, any>();
  for (const row of listings) {
    const cur = bestByOwner.get(row.owner_id);
    if (!cur || row.updated_at > cur.updated_at) bestByOwner.set(row.owner_id, row);
  }

  // 4. Build a card per profile; drop those without a matching listing if
  //    a listing-derived filter is active.
  const cards: ProducerCard[] = [];
  for (const p of (profs ?? []) as any[]) {
    const row = bestByOwner.get(p.id);
    if (hasListingFilter && !row) continue;
    cards.push({
      profile: {
        id: p.id,
        display_name: p.display_name,
        region_code: p.region_code,
        role: p.role,
        avatar_url: p.avatar_url,
        bio: p.bio,
      },
      region_name: p.regions?.name_el ?? p.region_code,
      municipality: p.municipality ?? null,
      product: row?.products ?? null,
      quantity: row ? Number(row.quantity) : null,
      unit: row ? row.unit ?? row.products.unit : null,
      attributes: row?.attributes ?? {},
      available_from: row?.available_from ?? null,
      available_until: row?.available_until ?? null,
      updated_at: row?.updated_at ?? p.updated_at,
      has_listing: Boolean(row),
    });
  }

  switch (filters.sort) {
    case "quantity_desc":
      cards.sort((a, b) => (b.quantity ?? -Infinity) - (a.quantity ?? -Infinity));
      break;
    case "quantity_asc":
      cards.sort((a, b) => (a.quantity ?? Infinity) - (b.quantity ?? Infinity));
      break;
    case "updated":
    default:
      cards.sort((a, b) => {
        if (a.has_listing !== b.has_listing) return a.has_listing ? -1 : 1;
        return b.updated_at.localeCompare(a.updated_at);
      });
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

const PUBLIC_PROFILE_COLUMNS = [
  "id",
  "role",
  "display_name",
  "region_code",
  "municipality",
  "avatar_url",
  "cover_url",
  "gallery",
  "bio",
  "website",
  "year_founded",
  "employees_range",
  "certifications",
  "specialties",
  "opening_hours",
  "is_public",
  "is_active",
  "is_verified",
  "deleted_at",
  "created_at",
  "updated_at",
  "regions(name_el)",
].join(",");

export async function getProfileById(id: string, includeContact = false) {
  const supabase = await createSupabaseServer();
  const selection = includeContact ? "*, regions(name_el)" : PUBLIC_PROFILE_COLUMNS;
  const { data } = await supabase.from("profiles").select(selection).eq("id", id).single();
  return data;
}

export async function getProfileListings(
  profileId: string,
  role: string,
  viewerRole?: string | null,
  isOwner = false,
) {
  const supabase = await createSupabaseServer();
  if (role === "merchant" || role === "factory") {
    const audienceKinds = isOwner || viewerRole === "admin" || viewerRole === "merchant" || viewerRole === "factory"
      ? ["buy_from_producer", "buy_from_merchant", "sell_wholesale", "sell_retail"]
      : ["buy_from_producer", "sell_retail"];
    const { data } = await supabase
      .from("price_listings")
      .select("*, products(name_el, unit, attributes_schema), regions(name_el)")
      .eq("owner_id", profileId)
      .eq("is_active", true)
      .in("kind", audienceKinds)
      .order("updated_at", { ascending: false });
    return { type: "price" as const, listings: (data as any[]) ?? [] };
  }
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("production_listings")
    .select("*, products(name_el, unit), regions(name_el)")
    .eq("owner_id", profileId)
    .eq("is_active", true)
    .or(`available_until.is.null,available_until.gte.${today}`)
    .order("updated_at", { ascending: false });
  return { type: "production" as const, listings: (data as any[]) ?? [] };
}
