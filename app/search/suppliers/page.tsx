export const dynamic = "force-dynamic";

import Link from "next/link";
import { Header } from "@/components/site/header";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Select, Label, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  searchBuyers,
  getRegions,
  getActiveProducts,
} from "@/lib/db/queries";
import { attributeLabel, formatRelative, priceFormat } from "@/lib/utils";
import { Footer } from "@/components/site/footer";
import { LiveSearchInput } from "@/components/site/live-search-input";
import { LiveFilterForm } from "@/components/site/live-filter-form";
import { SearchPagination } from "@/components/site/search-pagination";

const PAGE_SIZE = 12;
const SUPPLIER_CATEGORY = "Αγροεφόδια & υπηρεσίες";

export default async function SuppliersSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const g = (key: string) => {
    const value = params[key];
    return (Array.isArray(value) ? value[0] : value) ?? undefined;
  };

  const [regions, allProducts, results] = await Promise.all([
    getRegions(),
    getActiveProducts(),
    searchBuyers({
      buyer_type: ["agri_supplier"],
      region_code: g("region_code"),
      municipality: g("municipality"),
      product_id: g("product_id"),
      product_category: SUPPLIER_CATEGORY,
      name: g("name"),
      sort: (g("sort") as "price_asc" | "price_desc" | "updated") ?? "updated",
    }),
  ]);

  const supplierProducts = allProducts.filter((product) => product.category === SUPPLIER_CATEGORY);

  const requestedPage = parsePage(params.page);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageResults = results.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <>
      <Header />
      <div className="w-full min-w-0 max-w-6xl mx-auto overflow-x-hidden px-4 py-8">
        <div className="grid grid-cols-3 items-stretch border-b border-brand-border">
          <Link
            href="/search/buyers"
            className="min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 border-b-2 border-transparent text-center text-brand-muted hover:text-brand-dark text-sm sm:text-lg leading-tight"
          >
            <Icon name="store" className="shrink-0" /> <span>Βρες Αγοραστή</span>
          </Link>
          <Link
            href="/search/producers"
            className="min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 border-b-2 border-transparent text-center text-brand-muted hover:text-brand-dark text-sm sm:text-lg leading-tight"
          >
            <Icon name="seedling" className="shrink-0" /> <span>Βρες Παραγωγό</span>
          </Link>
          <Link
            href="/search/suppliers"
            className="min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 border-b-2 border-brand-dark text-center font-semibold text-brand-dark text-sm sm:text-lg leading-tight -mb-px"
          >
            <Icon name="listCheck" className="shrink-0" /> <span>Αγροεφόδια</span>
          </Link>
        </div>

        <div className="mt-6 mb-6">
          <Eyebrow>Αναζήτηση</Eyebrow>
          <h1 className="display text-[38px] leading-tight text-brand-dark mt-1 field-underline">
            Γεωπόνοι & Αγροεφόδια
          </h1>
          <p className="mt-3 text-brand-muted text-lg leading-relaxed">
            Καταστήματα με λιπάσματα, φυτοπροστασία, σπόρους, εργαλεία, μηχανήματα και γεωπονικές υπηρεσίες. Δεν είναι eshop — καλέστε απευθείας στο τηλέφωνο του καταστήματος.
          </p>
        </div>

        <LiveSearchInput placeholder="Αναζήτηση καταστήματος ή γεωπονικού γραφείου…" />

        <LiveFilterForm
          key={JSON.stringify(params)}
          resultsId="search-results"
          className="p-5 bg-brand-surface rounded-card border border-brand-border shadow-card mb-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label>Νομός</Label>
              <Select name="region_code" defaultValue={g("region_code") ?? ""}>
                <option value="">Όλοι</option>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.name_el}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Δήμος / περιοχή</Label>
              <Input name="municipality" placeholder="π.χ. Αιτωλικό" defaultValue={g("municipality") ?? ""} />
            </div>
            <div>
              <Label>Προϊόν / υπηρεσία</Label>
              <Select name="product_id" defaultValue={g("product_id") ?? ""}>
                <option value="">Όλα</option>
                {supplierProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_el}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Ταξινόμηση</Label>
              <Select name="sort" defaultValue={g("sort") ?? "updated"}>
                <option value="updated">Πιο πρόσφατα</option>
                <option value="price_asc">Χαμηλότερη τιμή</option>
                <option value="price_desc">Υψηλότερη τιμή</option>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" icon="search">Εφαρμογή</Button>
          </div>
        </LiveFilterForm>

        <div
          id="search-results"
          className="scroll-mt-24 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="text-sm text-brand-muted flex items-center gap-2">
            <Icon name="listCheck" /> <span className="figures">{results.length}</span> καταστήματα
            {results.length > PAGE_SIZE && (
              <span className="figures">
                · {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, results.length)}
              </span>
            )}
          </div>
        </div>

        {pageResults.length === 0 ? (
          <Card>
            <p className="text-brand-muted inline-flex items-center gap-2">
              <Icon name="info" /> Δεν βρέθηκαν καταστήματα με αυτά τα κριτήρια. Δοκίμασε να αφαιρέσεις κάποιο φίλτρο.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pageResults.map((r: any) => (
              <Link
                key={r.profile.id + (r.listing?.id ?? "")}
                href={`/profile/${r.profile.id}`}
                className="group block bg-brand-surface hover:bg-white border border-brand-border hover:border-brand-dark/40 rounded-card p-4 shadow-card transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="danger"><Icon name="listCheck" /> Αγροεφόδια</Badge>
                      <span className="font-semibold text-brand-dark truncate">{r.profile.display_name}</span>
                    </div>
                    <div className="text-sm text-brand-muted mt-1">
                      <Icon name="location" className="text-brand-earth" /> {r.profile.regions?.name_el ?? r.profile.region_code}
                      {r.profile.municipality && ` · ${r.profile.municipality}`}
                    </div>
                    {r.listing ? (
                      <div className="mt-3 rounded-md bg-white/60 border border-brand-border p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-medium text-brand-dark">{r.listing.products.name_el}</span>
                          {r.listing.variants?.[0]?.price != null && (
                            <span className="figures font-semibold text-brand-earth">
                              {priceFormat(Number(r.listing.variants[0].price), r.listing.products.unit)}
                            </span>
                          )}
                        </div>
                        {r.listing.variants?.[0]?.attributes && Object.keys(r.listing.variants[0].attributes).length > 0 && (
                          <div className="text-xs text-brand-muted mt-1">
                            {Object.entries(r.listing.variants[0].attributes)
                              .map(([k, v]) => `${attributeLabel(k)}: ${v}`)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-brand-muted mt-2 line-clamp-2">
                        {r.profile.bio || "Το κατάστημα δεν έχει καταχωρίσει τιμοκατάλογο ακόμη."}
                      </p>
                    )}
                    <div className="eyebrow text-brand-muted mt-3 inline-flex items-center gap-2">
                      <Icon name="phone" /> Καλέστε στο τηλέφωνο για διαθεσιμότητα και προσφορά.
                    </div>
                  </div>
                  <Icon name="arrowRight" className="text-brand-muted group-hover:text-brand-dark shrink-0 text-lg mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <SearchPagination
          basePath="/search/suppliers"
          params={params}
          currentPage={currentPage}
          totalItems={results.length}
          pageSize={PAGE_SIZE}
        />
      </div>
      <Footer />
    </>
  );
}

function parsePage(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const page = Number(value ?? 1);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
