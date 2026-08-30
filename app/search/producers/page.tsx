import Link from "next/link";
import { Header } from "@/components/site/header";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Select, Label, Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { searchProducers, getRegions, getActiveProducts, getProductCategories } from "@/lib/db/queries";
import { parseProducerFilters } from "@/lib/domain/search-params";
import { formatRelative, roleLabel } from "@/lib/utils";
import { FilterChips } from "@/components/site/filter-chips";
import { AttributeFilters } from "@/components/site/attribute-filters";
import { FiltersDrawer } from "@/components/site/filters-drawer";
import { Footer } from "@/components/site/footer";

export default async function ProducersSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseProducerFilters(params);
  const [regions, products, categories, results] = await Promise.all([
    getRegions(),
    getActiveProducts(),
    getProductCategories(),
    searchProducers(filters),
  ]);

  const regionMap = new Map(regions.map((r) => [r.code, r.name_el]));
  const productMap = new Map(products.map((p) => [p.id, p.name_el]));
  const selectedProduct = products.find((p) => p.id === filters.product_id);
  const filteredProducts = filters.product_category
    ? products.filter((p) => p.category === filters.product_category)
    : products;

  return (
    <>
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-1 border-b border-brand-border">
          <Link
            href="/search/buyers"
            className="inline-flex items-center gap-2 px-5 py-3 border-b-2 border-transparent text-brand-muted hover:text-brand-dark text-lg"
          >
            <Icon name="store" /> Βρες Αγοραστή
          </Link>
          <Link
            href="/search/producers"
            className="inline-flex items-center gap-2 px-5 py-3 border-b-2 border-brand-dark font-semibold text-brand-dark text-lg -mb-px"
          >
            <Icon name="seedling" /> Βρες Παραγωγό
          </Link>
        </div>

        <div className="mt-6 mb-6">
          <Eyebrow>Αναζήτηση</Eyebrow>
          <h1 className="display text-[38px] leading-tight text-brand-dark mt-1 field-underline">Βρες Παραγωγό</h1>
          <p className="mt-3 text-brand-muted text-lg leading-relaxed">
            Αγρότες με έτοιμη παραγωγή. Φιλτράρισε ανά περιοχή, προϊόν, ποιότητα, ποσότητα ή διαθεσιμότητα.
          </p>
        </div>

        <FiltersDrawer activeCount={countActive(params)}>
        <form className="p-5 bg-brand-surface rounded-card border border-brand-border shadow-card mb-6">
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
              <Label>Όνομα παραγωγού</Label>
              <Input name="name" placeholder="Αναζήτηση…" defaultValue={filters.name ?? ""} />
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
            <Link href="/search/producers" className="text-sm text-brand-muted hover:text-brand-dark underline underline-offset-2">
              Καθαρισμός
            </Link>
            <Button type="submit" icon="search" size="lg">
              Αναζήτηση
            </Button>
          </div>
        </form>
        </FiltersDrawer>

        <FilterChips
          basePath="/search/producers"
          params={params}
          regionLabels={regionMap}
          productLabels={productMap}
        />

        <div className="text-sm text-brand-muted mb-3 flex items-center gap-2">
          <Icon name="listCheck" /> <span className="figures">{results.length}</span> αποτελέσματα
        </div>

        {results.length === 0 ? (
          <Card>
            <div className="text-brand-ink text-lg flex items-center gap-3">
              <Icon name="info" className="text-brand-muted" /> Δε βρέθηκαν παραγωγοί με αυτά τα κριτήρια. Δοκίμασε να χαλαρώσεις κάποιο φίλτρο.
            </div>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {results.map((r, i) => (
              <Card key={`${r.profile.id}-${i}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-brand-dark text-lg truncate">{r.profile.display_name}</h3>
                      <Badge tone="brand">{roleLabel(r.profile.role)}</Badge>
                    </div>
                    <div className="text-sm text-brand-muted mt-0.5 flex items-center gap-1.5">
                      <Icon name="location" /> {r.region_name}
                      {r.municipality && ` · ${r.municipality}`}
                    </div>
                    <div className="mt-4">
                      <div className="text-sm text-brand-muted">{r.product.name_el}</div>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="figures text-3xl font-semibold text-brand-dark">{r.quantity}</span>
                        <span className="text-brand-muted text-base">{r.unit}</span>
                      </div>
                      {Object.keys(r.attributes).length > 0 && (
                        <div className="text-sm text-brand-muted mt-1">
                          {Object.entries(r.attributes).map(([k, v]) => `${k}: ${v}`).join(" · ")}
                        </div>
                      )}
                      {(r.available_from || r.available_until) && (
                        <div className="text-sm text-brand-muted mt-2 inline-flex items-center gap-1.5">
                          <Icon name="calendar" />
                          {r.available_from ?? "τώρα"} → {r.available_until ?? "ανοιχτό"}
                        </div>
                      )}
                    </div>
                    <div className="eyebrow text-brand-muted mt-3">Ενημέρωση {formatRelative(r.updated_at)}</div>
                  </div>
                  <Link href={`/profile/${r.profile.id}`} className="text-brand-mid hover:text-brand-dark shrink-0">
                    <Icon name="arrowRight" className="text-lg" />
                  </Link>
                </div>
              </Card>
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
