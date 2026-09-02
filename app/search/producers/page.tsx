export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/site/header";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Select, Label, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { searchProducers, getRegions, getActiveProducts } from "@/lib/db/queries";
import { parseProducerFilters } from "@/lib/domain/search-params";
import { attributeLabel, formatDate, formatQuantityNumber, formatRelative, hasFisherRole, pluralizeQuantityUnit, roleBadgeTone, roleLabel } from "@/lib/utils";
import { FilterChips } from "@/components/site/filter-chips";
import { AttributeFilters } from "@/components/site/attribute-filters";
import { FiltersDrawer } from "@/components/site/filters-drawer";
import { Footer } from "@/components/site/footer";
import { LiveSearchInput } from "@/components/site/live-search-input";
import { LiveFilterForm } from "@/components/site/live-filter-form";
import { SearchPagination } from "@/components/site/search-pagination";

const PAGE_SIZE = 12;

export default async function ProducersSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseProducerFilters(params);
  const [regions, products, results] = await Promise.all([
    getRegions(),
    getActiveProducts(),
    searchProducers(filters),
  ]);

  const producerProducts = products.filter((product) => {
    if (filters.producer_type === "fisher") return product.category === "Αλιευτικά είδη";
    if (filters.producer_type === "farmer") return product.category !== "Αλιευτικά είδη";
    return true;
  });
  const categories = [...new Set(producerProducts.map((product) => product.category))].sort((a, b) =>
    a.localeCompare(b, "el"),
  );
  const regionMap = new Map(regions.map((r) => [r.code, r.name_el]));
  const productMap = new Map(products.map((p) => [p.id, p.name_el]));
  const selectedProduct = producerProducts.find((p) => p.id === filters.product_id);
  const filteredProducts = filters.product_category
    ? producerProducts.filter((p) => p.category === filters.product_category)
    : producerProducts;
  const requestedPage = parsePage(params.page);
  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageStart = (currentPage - 1) * PAGE_SIZE;
  const pageResults = results.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <>
      <Header />
      <div className="w-full min-w-0 max-w-6xl mx-auto overflow-x-hidden px-4 py-8">
        <div className="grid grid-cols-2 items-stretch border-b border-brand-border">
          <Link
            href="/search/buyers"
            className="min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 border-b-2 border-transparent text-center text-brand-muted hover:text-brand-dark text-sm sm:text-lg leading-tight"
          >
            <Icon name="store" className="shrink-0" /> <span>Βρες Αγοραστή</span>
          </Link>
          <Link
            href="/search/producers"
            className="min-w-0 inline-flex items-center justify-center gap-1.5 px-2 sm:px-5 py-3 border-b-2 border-brand-dark text-center font-semibold text-brand-dark text-sm sm:text-lg leading-tight -mb-px"
          >
            <Icon name="seedling" className="shrink-0" /> <span>Βρες Παραγωγό ή Αλιέα</span>
          </Link>
        </div>

        <div className="mt-6 mb-6">
          <Eyebrow>Αναζήτηση</Eyebrow>
          <h1 className="display text-[38px] leading-tight text-brand-dark mt-1 field-underline">Βρες Παραγωγό ή Αλιέα</h1>
          <p className="mt-3 text-brand-muted text-lg leading-relaxed">
            Όλοι οι ενεργοί αγρότες και αλιείς, με ή χωρίς δηλωμένη παραγωγή ή αλίευμα. Φιλτράρισε ανά τύπο, περιοχή, προϊόν, είδος αλιεύματος, ποσότητα ή διαθεσιμότητα.
          </p>
        </div>

        <LiveSearchInput placeholder="Αναζήτηση αγρότη ή αλιέα με όνομα ή επωνυμία…" />

        <FiltersDrawer activeCount={countActive(params)}>
        <LiveFilterForm key={JSON.stringify(params)} resultsId="search-results" className="p-5 bg-brand-surface rounded-card border border-brand-border shadow-card mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <Label>Τύπος παραγωγού</Label>
              <Select name="producer_type" defaultValue={filters.producer_type ?? ""}>
                <option value="">Αγρότες + Αλιείς</option>
                <option value="farmer">Μόνο Αγρότες</option>
                <option value="fisher">Μόνο Αλιείς</option>
              </Select>
            </div>
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
              <Input name="municipality" placeholder="π.χ. Ηράκλειο" defaultValue={filters.municipality ?? ""} />
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
              <Label>Ελάχ. ποσότητα</Label>
              <Input type="number" min="0" name="quantity_min" defaultValue={filters.quantity_min ?? ""} placeholder="0" />
            </div>
            <div>
              <Label>Μέγ. ποσότητα</Label>
              <Input type="number" min="0" name="quantity_max" defaultValue={filters.quantity_max ?? ""} placeholder="∞" />
            </div>

            <div>
              <Label>Διαθέσιμο στις</Label>
              <Input type="date" name="date" defaultValue={filters.date ?? ""} />
            </div>

            <div>
              <Label>Ταξινόμηση</Label>
              <Select name="sort" defaultValue={filters.sort ?? "updated"}>
                <option value="updated">Πιο πρόσφατα</option>
                <option value="quantity_desc">Ποσότητα φθίνουσα</option>
                <option value="quantity_asc">Ποσότητα αύξουσα</option>
              </Select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
            <span className="hidden md:inline text-xs text-brand-muted mr-auto">Τα αποτελέσματα ενημερώνονται αυτόματα</span>
            <Link href="/search/producers" className="text-sm text-brand-muted hover:text-brand-dark underline underline-offset-2">
              Καθαρισμός
            </Link>
            <Button type="submit" icon="search" size="lg" className="md:hidden">
              Αναζήτηση
            </Button>
          </div>
        </LiveFilterForm>
        </FiltersDrawer>

        <FilterChips
          basePath="/search/producers"
          params={params}
          regionLabels={regionMap}
          productLabels={productMap}
        />

        <div
          id="search-results"
          className="scroll-mt-24 mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
        >
          <div className="text-sm text-brand-muted flex items-center gap-2">
            <Icon name="listCheck" /> <span className="figures">{results.length}</span> αποτελέσματα
            {results.length > PAGE_SIZE && (
              <span className="figures">· {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, results.length)}</span>
            )}
          </div>
          <SearchPagination
            basePath="/search/producers"
            params={params}
            currentPage={currentPage}
            totalItems={results.length}
            pageSize={PAGE_SIZE}
            placement="top"
          />
        </div>

        {results.length === 0 ? (
          <Card>
            <div className="text-brand-ink text-lg flex items-center gap-3">
              <Icon name="info" className="text-brand-muted" /> Δε βρέθηκαν παραγωγοί ή αλιείς με αυτά τα κριτήρια. Δοκίμασε να χαλαρώσεις κάποιο φίλτρο.
            </div>
          </Card>
        ) : (
          <div className="grid min-w-0 grid-cols-1 sm:grid-cols-2 gap-4">
            {pageResults.map((r) => (
              <Link
                key={r.profile.id}
                href={`/profile/${r.profile.id}`}
                prefetch
                className="group block w-full min-w-0 overflow-hidden bg-brand-surface border border-brand-border rounded-card shadow-card p-4 sm:p-6 hover:border-brand-dark/40 hover:shadow-elev transition-all"
              >
                <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 sm:gap-4">
                  <div
                    className={`w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border-2 text-white flex items-center justify-center shadow-sm ${
                      !r.profile.avatar_url && hasFisherRole(r.profile.role)
                        ? "border-sky-950 bg-sky-900"
                        : "border-brand-border bg-brand-dark"
                    }`}
                  >
                    {r.profile.avatar_url ? (
                      <Image
                        src={r.profile.avatar_url}
                        alt={`Φωτογραφία προφίλ ${r.profile.display_name}`}
                        width={64}
                        height={64}
                        unoptimized
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Icon name={hasFisherRole(r.profile.role) ? "fish" : "seedling"} className="text-xl" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <h3 className="min-w-0 max-w-full basis-full break-words font-semibold text-brand-dark text-base sm:basis-auto sm:text-lg group-hover:underline underline-offset-2 [overflow-wrap:anywhere]">{r.profile.display_name}</h3>
                      <Badge tone={roleBadgeTone(r.profile.role)} className="max-w-full whitespace-normal leading-snug">{roleLabel(r.profile.role)}</Badge>
                    </div>
                    <div className="min-w-0 text-sm text-brand-muted mt-1 flex items-start gap-1.5">
                      <Icon name="location" className="mt-0.5 shrink-0" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                        {r.region_name}{r.municipality && ` · ${r.municipality}`}
                      </span>
                    </div>
                    {r.has_listing && r.product ? (
                      <div className="mt-4">
                        <div className="break-words text-sm text-brand-muted [overflow-wrap:anywhere]">{r.product.name_el}</div>
                        <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-2">
                          <span className="figures text-3xl font-semibold text-brand-dark">
                            {r.quantity == null ? "—" : formatQuantityNumber(r.quantity)}
                          </span>
                          <span className="text-brand-muted text-base">
                            {r.quantity == null ? r.unit : pluralizeQuantityUnit(r.unit, r.quantity)}
                          </span>
                        </div>
                        {Object.keys(r.attributes).length > 0 && (
                          <div className="break-words text-sm text-brand-muted mt-1 [overflow-wrap:anywhere]">
                            {Object.entries(r.attributes).map(([k, v]) => `${attributeLabel(k)}: ${v}`).join(" · ")}
                          </div>
                        )}
                        {(r.available_from || r.available_until) && (
                          <div className="text-sm text-brand-muted mt-2 flex min-w-0 flex-wrap items-center gap-1.5">
                            <Icon name="calendar" className="shrink-0" />
                            <span className="min-w-0 break-words">
                              {r.available_from ? formatDate(r.available_from) : "τώρα"} → {r.available_until ? formatDate(r.available_until) : "ανοιχτό"}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <Badge tone="muted" className="max-w-full whitespace-normal text-left leading-snug">
                          {r.profile.role === "farmer_fisher"
                            ? "Χωρίς δηλωμένη παραγωγή ή αλίευμα"
                            : r.profile.role === "fisher"
                              ? "Χωρίς δηλωμένο αλίευμα"
                              : "Χωρίς δηλωμένη παραγωγή"}
                        </Badge>
                        <p className="break-words text-sm text-brand-muted mt-2 line-clamp-2 [overflow-wrap:anywhere]">
                          {r.profile.bio || (r.profile.role === "farmer_fisher"
                            ? "Ο παραγωγός και αλιέας δεν έχει καταχωρίσει διαθέσιμη παραγωγή ή αλίευμα ακόμη."
                            : r.profile.role === "fisher"
                              ? "Ο αλιέας δεν έχει καταχωρίσει διαθέσιμο αλίευμα ακόμη."
                              : "Ο παραγωγός δεν έχει καταχωρίσει διαθέσιμη παραγωγή ακόμη.")}
                        </p>
                      </div>
                    )}
                    <div className="eyebrow text-brand-muted mt-3">Ενημέρωση {formatRelative(r.updated_at)}</div>
                  </div>
                  <Icon name="arrowRight" className="text-brand-muted group-hover:text-brand-dark shrink-0 text-lg mt-1" />
                </div>
              </Link>
            ))}
          </div>
        )}

        <SearchPagination
          basePath="/search/producers"
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

function countActive(params: Record<string, string | string[] | undefined>): number {
  let n = 0;
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (k === "sort" || k === "page") continue;
    n++;
  }
  return n;
}

function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw ?? "1", 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}
