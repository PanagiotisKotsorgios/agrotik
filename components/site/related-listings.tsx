import Link from "next/link";
import Image from "next/image";
import { Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { priceFormat } from "@/lib/utils";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { PriceListKind } from "@/lib/db/types";

interface RelatedRow {
  id: string;
  owner_id: string;
  product_id: string;
  kind: PriceListKind;
  title: string | null;
  gallery: { url: string; alt?: string }[];
  variants: { attributes: Record<string, string | number>; price: number }[];
  updated_at: string;
  products: { id: string; name_el: string; unit: string; category: string };
  owner: {
    id: string;
    display_name: string;
    is_active: boolean;
    is_public: boolean;
  };
}

const SELECT = `id, owner_id, product_id, kind, title, gallery, variants, updated_at,
  products!inner(id, name_el, unit, category),
  owner:profiles!price_listings_owner_id_fkey(id, display_name, is_active, is_public)`;

interface Options {
  /**
   * ID of the current listing to exclude, if any.
   */
  excludeListingId?: string | null;
  /**
   * Product id used as the primary similarity signal.
   */
  productId?: string | null;
  /**
   * Category name (products.category). Used as a fallback when
   * there aren't enough matches by product.
   */
  category?: string | null;
  /**
   * When present, first surface listings from the same owner (that
   * aren't the current one). Useful on the listing detail page.
   */
  sameOwnerFirstFor?: string | null;
  /**
   * When present, listings owned by this profile id are excluded
   * from the results entirely. Useful on the profile page so the
   * "παρόμοια από άλλους" section doesn't repeat what the visitor
   * is already looking at.
   */
  excludeOwnerId?: string | null;
  /**
   * How many cards to render.
   */
  limit?: number;
  /**
   * Section heading override.
   */
  heading?: string;
  /**
   * Eyebrow override.
   */
  eyebrow?: string;
  /**
   * Rendered when no rows match. Defaults to null (section hidden).
   */
  emptyFallback?: React.ReactNode;
}

async function fetchRelated({
  excludeListingId,
  excludeOwnerId,
  productId,
  category,
  sameOwnerFirstFor,
  limit,
}: Options): Promise<RelatedRow[]> {
  const supabase = await createSupabaseServer();
  const max = limit ?? 6;
  const seen = new Set<string>();
  const results: RelatedRow[] = [];
  if (excludeListingId) seen.add(excludeListingId);

  const push = (rows: RelatedRow[] | null | undefined) => {
    for (const row of rows ?? []) {
      if (results.length >= max) break;
      if (!row?.owner?.is_active || !row?.owner?.is_public) continue;
      if (seen.has(row.id)) continue;
      if (excludeOwnerId && row.owner_id === excludeOwnerId) continue;
      seen.add(row.id);
      results.push(row);
    }
  };

  if (sameOwnerFirstFor) {
    const { data } = await supabase
      .from("price_listings")
      .select(SELECT)
      .eq("is_active", true)
      .eq("owner_id", sameOwnerFirstFor)
      .order("updated_at", { ascending: false })
      .limit(max * 2);
    push(data as unknown as RelatedRow[] | null);
  }
  if (results.length >= max) return results;

  if (productId) {
    const { data } = await supabase
      .from("price_listings")
      .select(SELECT)
      .eq("is_active", true)
      .eq("product_id", productId)
      .order("updated_at", { ascending: false })
      .limit(max * 2);
    push(data as unknown as RelatedRow[] | null);
  }
  if (results.length >= max) return results;

  if (category) {
    const { data } = await supabase
      .from("price_listings")
      .select(SELECT)
      .eq("is_active", true)
      .eq("products.category", category)
      .order("updated_at", { ascending: false })
      .limit(max * 2);
    push(data as unknown as RelatedRow[] | null);
  }

  return results;
}

function bestPrice(row: RelatedRow): number | null {
  const prices = row.variants
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length === 0 ? null : Math.min(...prices);
}

export async function RelatedListings(props: Options) {
  const items = await fetchRelated(props);
  if (items.length === 0) return props.emptyFallback ? <>{props.emptyFallback}</> : null;

  return (
    <section aria-labelledby="related-heading" className="space-y-4">
      <div>
        <Eyebrow>{props.eyebrow ?? "Προτεινόμενα"}</Eyebrow>
        <h2 id="related-heading" className="display text-2xl text-brand-dark mt-1">
          {props.heading ?? "Παρόμοια προϊόντα"}
        </h2>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <RelatedCard item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function RelatedCard({ item }: { item: RelatedRow }) {
  const gallery = Array.isArray(item.gallery) ? item.gallery : [];
  const cover = gallery.find((g) => typeof g.url === "string" && /^https?:\/\//i.test(g.url));
  const price = bestPrice(item);
  const period = item.variants.find((v) => v.attributes?.period)?.attributes?.period as string | undefined;
  return (
    <Link
      href={`/listing/${item.id}`}
      className="group block rounded-card overflow-hidden border border-brand-border bg-brand-surface hover:border-brand-dark/40 hover:shadow-card transition-colors"
    >
      <div className="relative aspect-[4/3] bg-brand-bg">
        {cover ? (
          <Image
            src={cover.url}
            alt={cover.alt ?? item.products.name_el}
            fill
            unoptimized
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-brand-muted">
            <Icon name="image" className="text-2xl" />
          </div>
        )}
      </div>
      <div className="p-3 space-y-1">
        <div className="text-[11px] uppercase tracking-wide text-brand-muted truncate">
          {item.products.category}
        </div>
        <div className="font-semibold text-brand-dark text-sm leading-tight line-clamp-2">
          {item.title || item.products.name_el}
        </div>
        <div className="text-xs text-brand-muted truncate">{item.owner.display_name}</div>
        {price !== null && (
          <div className="figures font-semibold text-brand-earth text-sm">
            {priceFormat(price, item.products.unit)}
            {item.kind === "rent_supply" && period && (
              <span className="text-xs font-normal text-brand-muted"> / {period}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
