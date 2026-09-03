export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Badge, Eyebrow, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { createSupabaseServer } from "@/lib/supabase/server";
import { attributeLabel, formatRelative, priceFormat, roleBadgeTone, roleLabel } from "@/lib/utils";
import { PRICE_LIST_KIND_LABEL, type PriceListKind } from "@/lib/db/types";
import { ListingCarousel } from "@/components/site/listing-carousel";
import { getAppOrigin } from "@/lib/app-origin";

interface Listing {
  id: string;
  owner_id: string;
  product_id: string;
  kind: PriceListKind;
  title: string | null;
  description: string | null;
  gallery: { url: string; alt?: string }[];
  notes: string | null;
  variants: { attributes: Record<string, string | number>; price: number }[];
  region_code: string;
  updated_at: string;
  products: { id: string; name_el: string; unit: string; category: string };
  regions: { name_el: string } | null;
  owner: {
    id: string;
    display_name: string;
    role: string;
    phone: string | null;
    municipality: string | null;
    avatar_url: string | null;
    bio: string | null;
    is_active: boolean;
    is_public: boolean;
    regions: { name_el: string } | null;
  };
}

const LISTING_SELECT = `id, owner_id, product_id, kind, title, description, gallery, notes, variants,
   region_code, updated_at,
   products!inner(id, name_el, unit, category),
   regions(name_el),
   owner:profiles!price_listings_owner_id_fkey(
     id, display_name, role, phone, municipality, avatar_url, bio,
     is_active, is_public, regions(name_el)
   )`;

async function fetchListing(id: string): Promise<Listing | null> {
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("price_listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  const listing = data as unknown as Listing | null;
  if (!listing || !listing.owner?.is_active || !listing.owner?.is_public) return null;
  return listing;
}

async function fetchRelated(listing: Listing): Promise<Listing[]> {
  const supabase = await createSupabaseServer();
  const excludeIds = [listing.id];
  const results: Listing[] = [];

  // 1. Same owner, other listings.
  const { data: sameOwner } = await supabase
    .from("price_listings")
    .select(LISTING_SELECT)
    .eq("is_active", true)
    .eq("owner_id", listing.owner_id)
    .neq("id", listing.id)
    .order("updated_at", { ascending: false })
    .limit(6);
  for (const row of (sameOwner as unknown as Listing[]) ?? []) {
    if (row.owner?.is_active && row.owner?.is_public) {
      results.push(row);
      excludeIds.push(row.id);
      if (results.length >= 6) return results;
    }
  }

  // 2. Same product from other sellers.
  const { data: sameProduct } = await supabase
    .from("price_listings")
    .select(LISTING_SELECT)
    .eq("is_active", true)
    .eq("product_id", listing.product_id)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .order("updated_at", { ascending: false })
    .limit(6);
  for (const row of (sameProduct as unknown as Listing[]) ?? []) {
    if (row.owner?.is_active && row.owner?.is_public) {
      results.push(row);
      excludeIds.push(row.id);
      if (results.length >= 6) return results;
    }
  }

  // 3. Fallback: same category from other sellers.
  const { data: sameCategory } = await supabase
    .from("price_listings")
    .select(LISTING_SELECT)
    .eq("is_active", true)
    .eq("products.category", listing.products.category)
    .not("id", "in", `(${excludeIds.join(",")})`)
    .order("updated_at", { ascending: false })
    .limit(6);
  for (const row of (sameCategory as unknown as Listing[]) ?? []) {
    if (row.owner?.is_active && row.owner?.is_public) {
      results.push(row);
      if (results.length >= 6) return results;
    }
  }

  return results;
}

function bestPrice(listing: Listing): number | null {
  const prices = listing.variants
    .map((v) => Number(v.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  return prices.length === 0 ? null : Math.min(...prices);
}

function galleryImages(listing: Listing) {
  const arr = Array.isArray(listing.gallery) ? listing.gallery : [];
  return arr
    .filter((g) => typeof g.url === "string" && /^https?:\/\//i.test(g.url))
    .map((g) => ({ url: g.url, alt: g.alt }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return { title: "Καταχώρηση", robots: { index: false, follow: false } };
  }
  const listing = await fetchListing(id).catch(() => null);
  if (!listing) return { title: "Καταχώρηση", robots: { index: false, follow: false } };

  const price = bestPrice(listing);
  const name = listing.title || listing.products.name_el;
  const region = listing.regions?.name_el ?? listing.owner?.regions?.name_el ?? "";
  const priceHint = price !== null ? ` — από ${price.toFixed(2)} €` : "";
  const description = (listing.description ?? listing.notes ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155) ||
    `${name}${priceHint}. Καταχώρηση από ${listing.owner.display_name}${region ? `, ${region}` : ""}.`;
  const images = galleryImages(listing);
  const primaryImage = images[0]?.url ?? listing.owner.avatar_url ?? "/hero.jpg";

  return {
    title: `${name}${priceHint}`,
    description,
    alternates: { canonical: `/listing/${listing.id}` },
    openGraph: {
      type: "website",
      title: name,
      description,
      url: `/listing/${listing.id}`,
      images: [{ url: primaryImage, alt: images[0]?.alt ?? name }],
    },
    twitter: {
      card: "summary_large_image",
      title: name,
      description,
      images: [primaryImage],
    },
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const listing = await fetchListing(id);
  if (!listing) notFound();

  const images = galleryImages(listing);
  const isSupplier = listing.owner.role === "agri_supplier";
  const isRental = listing.kind === "rent_supply";
  const price = bestPrice(listing);
  const productName = listing.products.name_el;
  const displayTitle = listing.title || productName;
  const [related] = await Promise.all([fetchRelated(listing)]);

  const origin = getAppOrigin();
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: displayTitle,
    description: listing.description ?? listing.notes ?? undefined,
    category: listing.products.category,
    image: images.length > 0 ? images.map((img) => img.url) : undefined,
    sku: listing.id,
    brand: { "@type": "Organization", name: listing.owner.display_name },
    url: `${origin}/listing/${listing.id}`,
    offers:
      price !== null
        ? {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: price.toFixed(2),
            availability: "https://schema.org/InStock",
            url: `${origin}/listing/${listing.id}`,
            seller: {
              "@type": "Organization",
              name: listing.owner.display_name,
              telephone: listing.owner.phone ?? undefined,
              address: listing.owner.regions?.name_el
                ? {
                    "@type": "PostalAddress",
                    addressLocality: listing.owner.municipality ?? undefined,
                    addressRegion: listing.owner.regions.name_el,
                    addressCountry: "GR",
                  }
                : undefined,
            },
          }
        : undefined,
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Αρχική", item: `${origin}/` },
      {
        "@type": "ListItem",
        position: 2,
        name: isSupplier ? "Αγροεφόδια" : "Αγοραστές",
        item: `${origin}${isSupplier ? "/search/suppliers" : "/search/buyers"}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: displayTitle,
        item: `${origin}/listing/${listing.id}`,
      },
    ],
  };

  return (
    <>
      <Header />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <main className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8">
        <nav aria-label="Breadcrumb" className="text-sm text-brand-muted">
          <Link href="/" className="hover:underline">Αρχική</Link>
          <span aria-hidden> · </span>
          {isSupplier ? (
            <Link href="/search/suppliers" className="hover:underline">Αγροεφόδια</Link>
          ) : (
            <Link href="/search/buyers" className="hover:underline">Αγοραστές</Link>
          )}
          <span aria-hidden> · </span>
          <span className="text-brand-ink/70">{productName}</span>
        </nav>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 lg:gap-10 items-start">
          <div className="min-w-0 space-y-6">
            <ListingCarousel images={images} productName={displayTitle} />

            {listing.description && (
              <Card>
                <CardTitle>Πληροφορίες προϊόντος</CardTitle>
                <p className="mt-3 text-brand-ink/90 whitespace-pre-wrap break-words leading-relaxed">
                  {listing.description}
                </p>
              </Card>
            )}

            {listing.notes && (
              <Card>
                <CardTitle>Σημειώσεις</CardTitle>
                <p className="mt-3 text-sm text-brand-ink/85 whitespace-pre-wrap break-words">
                  {listing.notes}
                </p>
              </Card>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24">
            <div>
              <Eyebrow>
                {listing.products.category}
                <span aria-hidden> · </span>
                {PRICE_LIST_KIND_LABEL[listing.kind]}
                {isRental && (
                  <Badge tone="warn" className="ml-2 align-middle">Προς ενοικίαση</Badge>
                )}
              </Eyebrow>
              <h1 className="display text-3xl sm:text-4xl text-brand-dark mt-2 leading-tight">
                {displayTitle}
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                {productName}
                {listing.regions?.name_el && ` · ${listing.regions.name_el}`}
                <span aria-hidden> · </span>Ενημέρωση {formatRelative(listing.updated_at)}
              </p>
            </div>

            <Card>
              <CardTitle>
                {isRental ? "Τιμές ενοικίασης" : `Τιμές (${listing.products.unit})`}
              </CardTitle>
              <div className="mt-3 divide-y divide-brand-border">
                {listing.variants.map((v, i) => {
                  const period = v.attributes?.period as string | undefined;
                  const restEntries = Object.entries(v.attributes ?? {})
                    .filter(([k]) => k !== "period")
                    .map(([k, val]) => `${attributeLabel(k)}: ${val}`);
                  const desc = restEntries.length > 0 ? restEntries.join(" · ") : "Βασική τιμή";
                  return (
                    <div key={i} className="flex items-start justify-between gap-3 py-2.5">
                      <span className="text-sm text-brand-ink/85">{desc}</span>
                      <span className="figures font-semibold text-brand-earth whitespace-nowrap">
                        {priceFormat(Number(v.price), listing.products.unit)}
                        {isRental && period && (
                          <span className="text-sm font-normal text-brand-muted"> / {period}</span>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              {isRental && (
                <p className="mt-3 text-xs text-brand-muted">
                  Επικοινώνησε με το κατάστημα για διαθεσιμότητα, εγγύηση και όρους παράδοσης.
                </p>
              )}
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0">
                  {listing.owner.display_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <Badge tone={roleBadgeTone(listing.owner.role)}>{roleLabel(listing.owner.role)}</Badge>
                  <Link
                    href={`/profile/${listing.owner.id}`}
                    className="mt-1 block font-semibold text-brand-dark truncate hover:underline"
                  >
                    {listing.owner.display_name}
                  </Link>
                </div>
              </div>
              <div className="mt-3 text-sm text-brand-muted">
                <Icon name="location" className="text-brand-earth" />{" "}
                {listing.owner.regions?.name_el ?? listing.owner.municipality ?? ""}
                {listing.owner.municipality && listing.owner.regions?.name_el && ` · ${listing.owner.municipality}`}
              </div>

              {listing.owner.phone ? (
                <a
                  href={`tel:${listing.owner.phone}`}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 px-4 py-3 rounded-md bg-brand-dark text-white font-semibold hover:bg-brand-mid"
                >
                  <Icon name="phone" /> {listing.owner.phone}
                </a>
              ) : (
                <div className="mt-4 text-sm text-brand-muted">Δεν υπάρχει τηλέφωνο στο προφίλ.</div>
              )}

              <Link
                href={`/dashboard/messages/${listing.owner.id}`}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-brand-border text-brand-dark font-semibold hover:border-brand-dark hover:bg-brand-dark/5"
              >
                <Icon name="chat" /> Στείλε μήνυμα
              </Link>

              <p className="mt-3 text-xs text-brand-muted leading-relaxed">
                Το AGROTIK δεν λειτουργεί ως eshop. Επικοινώνησε απευθείας για διαθεσιμότητα και παραγγελία.
              </p>
            </Card>

            <Link
              href={`/profile/${listing.owner.id}`}
              className="block text-sm text-brand-mid hover:underline text-center"
            >
              Δες όλες τις καταχωρήσεις του καταστήματος →
            </Link>
          </aside>
        </div>

        {related.length > 0 && <RelatedSection current={listing} items={related} />}
      </main>
      <Footer />
    </>
  );
}

function RelatedSection({ current, items }: { current: Listing; items: Listing[] }) {
  const bySameOwner = items.filter((row) => row.owner_id === current.owner_id);
  const byOthers = items.filter((row) => row.owner_id !== current.owner_id);
  return (
    <section aria-labelledby="related-heading" className="space-y-4">
      <div>
        <Eyebrow>Προτεινόμενα</Eyebrow>
        <h2 id="related-heading" className="display text-2xl text-brand-dark mt-1">
          {bySameOwner.length > 0
            ? "Άλλα προϊόντα από το ίδιο κατάστημα"
            : "Παρόμοια προϊόντα από άλλα καταστήματα"}
        </h2>
      </div>
      <ul className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <li key={item.id}>
            <RelatedCard item={item} />
          </li>
        ))}
      </ul>
      {bySameOwner.length > 0 && byOthers.length > 0 && (
        <p className="text-xs text-brand-muted">
          Πάνω από ένα κατάστημα εμπορεύεται παρόμοια προϊόντα. Δες τη λίστα καταστημάτων{" "}
          <Link href="/search/suppliers" className="text-brand-mid hover:underline">εδώ</Link>.
        </p>
      )}
    </section>
  );
}

function RelatedCard({ item }: { item: Listing }) {
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
