export const dynamic = "force-dynamic";

import Link from "next/link";
import { Header } from "@/components/site/header";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Select, Label, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { searchBuyers, getRegions, getActiveProducts, getProductCategories } from "@/lib/db/queries";
import { parseBuyerFilters } from "@/lib/domain/search-params";
import { formatRelative, priceFormat, roleLabel } from "@/lib/utils";
import { FilterChips } from "@/components/site/filter-chips";
import { AttributeFilters } from "@/components/site/attribute-filters";
import { FiltersDrawer } from "@/components/site/filters-drawer";
import { Footer } from "@/components/site/footer";
import { LiveSearchInput } from "@/components/site/live-search-input";
import { LiveFilterForm } from "@/components/site/live-filter-form";

export default async function BuyersSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseBuyerFilters(params);
  const [regions, products, categories, results] = await Promise.all([
    getRegions(),
    getActiveProducts(),
    getProductCategories(),
    searchBuyers(filters),
  ]);

  const regionMap = new Map(regions.map((r) => [r.code, r.name_el]));
  const productMap = new Map(products.map((p) => [p.id, p.name_el]));
  const selectedProduct = products.find((p) => p.id === filters.product_id);
  const filteredProducts = filters.product_category
    ? products.filter((p) => p.category === filters.product_category)
    : products;

  const buyerTypeStr = filters.buyer_type?.join(",") ?? "";

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs active="buyers" />

        <div className="mt-6 mb-6">
          <Eyebrow>Αναζήτηση</Eyebrow>
          <h1 className="display text-[38px] leading-tight text-brand-dark mt-1 field-underline">Βρες Αγοραστή</h1>
          <p className="mt-3 text-brand-muted text-lg leading-relaxed">
            Όλοι οι ενεργοί έμποροι και τα εργοστάσια, με ή χωρίς τιμοκατάλογο. Φιλτράρισε ανά προϊόν, ποιότητα, νομό, δήμο ή τιμή.
          </p>
        </div>

        <LiveSearchInput placeholder="Αναζήτηση εμπόρου ή εργοστασίου…" resultsId="search-results" />

        <FiltersDrawer activeCount={countActive(params)}>
        <LiveFilterForm key={JSON.stringify(params)} resultsId="search-results" className="p-5 bg-brand-surface rounded-card border border-brand-border shadow-card mb-6">
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <Label>Νομός</Label>
              <Select name="region_code" defaultValue={filters.region_code ?? ""}>
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
              <Input name="municipality" placeholder="π.χ. Καλαμάτα" defaultValue={filters.municipality ?? ""} />
            </div>
            <div>
              <Label>Κατηγορία</Label>
              <Select name="product_category" defaultValue={filters.product_category ?? ""}>
                <option value="">Όλες</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Προϊόν</Label>
              <Select name="product_id" defaultValue={filters.product_id ?? ""}>
                <option value="">Όλα</option>
                {filteredProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name_el}
                  </option>
                ))}
              </Select>
            </div>

            {selectedProduct && <AttributeFilters product={selectedProduct} values={params} />}

            <div>
              <Label>Τιμή από (€)</Label>
              <Input type="number" step="0.01" min="0" name="price_min" defaultValue={filters.price_min ?? ""} placeholder="0" />
            </div>
            <div>
              <Label>Τιμή έως (€)</Label>
              <Input type="number" step="0.01" min="0" name="price_max" defaultValue={filters.price_max ?? ""} placeholder="∞" />
            </div>

            <div>
              <Label>Τύπος αγοραστή</Label>
              <Select name="buyer_type" defaultValue={buyerTypeStr}>
                <option value="">Έμπορος + Εργοστάσιο</option>
                <option value="merchant">Μόνο Έμποροι</option>
                <option value="factory">Μόνο Εργοστάσια</option>
              </Select>
            </div>

            <div>
              <Label>Επωνυμία</Label>
              <Input name="name" placeholder="Αναζήτηση…" defaultValue={filters.name ?? ""} />
            </div>

            <div>
              <Label>Ταξινόμηση</Label>
              <Select name="sort" defaultValue={filters.sort ?? "price_asc"}>
                <option value="price_asc">Καλύτερη τιμή</option>
                <option value="price_desc">Ακριβότερη πρώτη</option>
                <option value="updated">Πιο πρόσφατη</option>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <span className="hidden md:inline text-xs text-brand-muted mr-auto">Τα αποτελέσματα ενημερώνονται αυτόματα</span>
            <Link href="/search/buyers" className="text-sm text-brand-muted hover:text-brand-dark underline underline-offset-2">
              Καθαρισμός
            </Link>
            <Button type="submit" icon="search" size="lg" className="md:hidden">
              Αναζήτηση
            </Button>
          </div>
        </LiveFilterForm>
        </FiltersDrawer>

        <FilterChips
          basePath="/search/buyers"
          params={params}
          regionLabels={regionMap}
          productLabels={productMap}
        />

        <div id="search-results" className="text-sm text-brand-muted mb-3 flex items-center gap-2">
          <Icon name="listCheck" /> <span className="figures">{results.length}</span> αποτελέσματα
        </div>

        {results.length === 0 ? (
          <Card>
            <div className="text-brand-ink text-lg flex items-center gap-3">
              <Icon name="info" className="text-brand-muted" /> Δε βρέθηκαν έμποροι/εργοστάσια με αυτά τα κριτήρια. Δοκίμασε να χαλαρώσεις κάποιο φίλτρο.
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {results.map((r) => (
              <Link
                key={r.profile.id}
                href={`/profile/${r.profile.id}`}
                prefetch
                className="group block bg-brand-surface border border-brand-border rounded-card shadow-card p-5 sm:p-6 hover:border-brand-dark/40 hover:shadow-elev transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border-2 border-brand-border bg-brand-dark text-white flex items-center justify-center shadow-sm">
                    {r.profile.avatar_url ? (
                      <img
                        src={r.profile.avatar_url}
                        alt={`Φωτογραφία προφίλ ${r.profile.display_name}`}
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon name="store" className="text-xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-brand-dark text-lg truncate group-hover:underline underline-offset-2">{r.profile.display_name}</h3>
                      <Badge tone="brand">{roleLabel(r.profile.role)}</Badge>
                    </div>
                    <div className="text-sm text-brand-muted mt-0.5 flex items-center gap-1.5">
                      <Icon name="location" /> {r.region_name}
                      {r.municipality && ` · ${r.municipality}`}
                    </div>
                    {r.has_listing && r.product ? (
                      <div className="mt-4">
                        <div className="text-sm text-brand-muted">{r.product.name_el}</div>
                        <div className="figures text-3xl font-semibold mt-1 text-brand-dark">
                          {r.best_price != null ? `από ${priceFormat(r.best_price, r.product.unit)}` : "—"}
                        </div>
                        {r.best_attributes && (
                          <div className="text-sm text-brand-muted mt-1">
                            {Object.entries(r.best_attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Badge tone="muted">Χωρίς καταχωρισμένο τιμοκατάλογο</Badge>
                        <p className="text-sm text-brand-muted mt-2 line-clamp-2">
                          {r.profile.bio || "Ο αγοραστής δεν έχει καταχωρίσει τιμές αγοράς ακόμη."}
                        </p>
                      </div>
                    )}
                    <div className="eyebrow text-brand-muted mt-3">
                      Ενημέρωση {formatRelative(r.updated_at)}
                    </div>
                  </div>
                  <Icon name="arrowRight" className="text-brand-muted group-hover:text-brand-dark shrink-0 text-lg mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}

function countActive(params: Record<string, string | string[] | undefined>): number {
  let n = 0;
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === "sort") continue;
    n++;
  }
  return n;
}

function Tabs({ active }: { active: "buyers" | "producers" }) {
  const items = [
    { key: "buyers", href: "/search/buyers", label: "Βρες Αγοραστή", icon: "store" as const },
    { key: "producers", href: "/search/producers", label: "Βρες Παραγωγό", icon: "seedling" as const },
  ];
  return (
    <div className="flex items-center gap-1 border-b border-brand-border">
      {items.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={
            active === t.key
              ? "inline-flex items-center gap-2 px-5 py-3 border-b-2 border-brand-dark font-semibold text-brand-dark text-lg -mb-px"
              : "inline-flex items-center gap-2 px-5 py-3 border-b-2 border-transparent text-brand-muted hover:text-brand-dark text-lg"
          }
        >
          <Icon name={t.icon} /> {t.label}
        </Link>
      ))}
    </div>
  );
}
