export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Badge, Eyebrow, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { createSupabaseServer } from "@/lib/supabase/server";
import { attributeLabel, formatRelative, priceFormat, roleBadgeTone, roleLabel } from "@/lib/utils";
import { PRICE_LIST_KIND_LABEL, type PriceListKind } from "@/lib/db/types";

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
  products: { name_el: string; unit: string; category: string };
  regions: { name_el: string } | null;
  owner: {
    id: string;
    display_name: string;
    role: string;
    phone: string | null;
    municipality: string | null;
    avatar_url: string | null;
    is_active: boolean;
    is_public: boolean;
    regions: { name_el: string } | null;
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("price_listings")
    .select(
      `id, owner_id, product_id, kind, title, description, gallery, notes, variants,
       region_code, updated_at,
       products!inner(name_el, unit, category),
       regions(name_el),
       owner:profiles!price_listings_owner_id_fkey(
         id, display_name, role, phone, municipality, avatar_url,
         is_active, is_public, regions(name_el)
       )`,
    )
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();
  const listing = data as unknown as Listing | null;
  if (!listing || !listing.owner?.is_active || !listing.owner?.is_public) notFound();

  const gallery = Array.isArray(listing.gallery) ? listing.gallery : [];
  const primaryImage = gallery[0]?.url ?? null;
  const isSupplier = listing.owner.role === "agri_supplier";

  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <nav className="text-sm text-brand-muted">
          <Link href="/" className="hover:underline">Αρχική</Link>{" "}·{" "}
          {isSupplier ? (
            <Link href="/search/suppliers" className="hover:underline">Αγροεφόδια</Link>
          ) : (
            <Link href="/search/buyers" className="hover:underline">Αγοραστές</Link>
          )}
          {" "}·{" "}
          <span className="text-brand-ink/70">{listing.products.name_el}</span>
        </nav>

        <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-6 min-w-0">
            {primaryImage && (
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-brand-bg border border-brand-border">
                <Image
                  src={primaryImage}
                  alt={gallery[0]?.alt ?? listing.title ?? listing.products.name_el}
                  fill
                  unoptimized
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="object-cover"
                />
              </div>
            )}

            <div>
              <Eyebrow>
                {listing.products.category}
                {" · "}
                {PRICE_LIST_KIND_LABEL[listing.kind]}
              </Eyebrow>
              <h1 className="display text-3xl sm:text-4xl text-brand-dark mt-2 leading-tight">
                {listing.title || listing.products.name_el}
              </h1>
              <p className="mt-1 text-sm text-brand-muted">
                {listing.products.name_el}
                {listing.regions?.name_el && ` · ${listing.regions.name_el}`}
                {" · Ενημέρωση "}
                {formatRelative(listing.updated_at)}
              </p>
            </div>

            <Card>
              <CardTitle>Τιμές {`(${listing.products.unit})`}</CardTitle>
              <div className="mt-3 divide-y divide-brand-border">
                {listing.variants.map((v, i) => {
                  const attrs = Object.entries(v.attributes ?? {})
                    .map(([k, val]) => `${attributeLabel(k)}: ${val}`)
                    .join(" · ");
                  return (
                    <div key={i} className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-sm text-brand-ink/85">{attrs || "Βασική τιμή"}</span>
                      <span className="figures font-semibold text-brand-earth">
                        {priceFormat(Number(v.price), listing.products.unit)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>

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

            {gallery.length > 1 && (
              <div>
                <Eyebrow>Φωτογραφίες</Eyebrow>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mt-2">
                  {gallery.map((g, i) => (
                    <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-brand-bg border border-brand-border">
                      <Image
                        src={g.url}
                        alt={g.alt ?? ""}
                        fill
                        unoptimized
                        sizes="(max-width: 640px) 50vw, 25vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="md:sticky md:top-24 space-y-4">
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
      </main>
      <Footer />
    </>
  );
}
