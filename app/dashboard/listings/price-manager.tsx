"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { savePriceListing, deletePriceListing } from "@/lib/actions/listings";
import type { Product, Region, PriceVariant, AttributesSchema, PriceListKind } from "@/lib/db/types";
import { PRICE_LIST_KIND_LABEL, PRICE_LIST_KIND_HELP } from "@/lib/db/types";
import { priceFormat } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/card";

interface ListingRow {
  id: string;
  product_id: string;
  kind?: PriceListKind;
  title?: string | null;
  region_code: string;
  notes: string | null;
  variants: PriceVariant[];
  updated_at: string;
  products: { name_el: string; unit: string; attributes_schema: AttributesSchema };
  regions: { name_el: string };
}

const KIND_OPTIONS_BY_ROLE: Record<"merchant" | "factory", PriceListKind[]> = {
  merchant: ["buy_from_producer", "sell_wholesale", "sell_retail"],
  factory: ["buy_from_producer", "buy_from_merchant", "sell_wholesale", "sell_retail"],
};

const KIND_TONE: Record<PriceListKind, "brand" | "olive" | "warn" | "muted"> = {
  buy_from_producer: "brand",
  buy_from_merchant: "olive",
  sell_wholesale: "warn",
  sell_retail: "muted",
};

export function PriceListingsManager({
  initialListings,
  products,
  regions,
  role = "merchant",
}: {
  initialListings: ListingRow[];
  products: Product[];
  regions: Region[];
  role?: "merchant" | "factory";
}) {
  const kindOptions = KIND_OPTIONS_BY_ROLE[role];
  const [listings, setListings] = useState(initialListings);
  const [editing, setEditing] = useState<Partial<ListingRow> | null>(null);

  return (
    <div className="space-y-4">
      {!editing && (
        <Button onClick={() => setEditing({ variants: [] })} className="inline-flex items-center gap-2">
          <Icon name="plus" /> Νέος τιμοκατάλογος
        </Button>
      )}

      {editing && (
        <PriceEditor
          products={products}
          regions={regions}
          kindOptions={kindOptions}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={(saved) => {
            setListings((prev) => {
              const other = prev.filter((l) => l.id !== saved.id);
              return [saved, ...other];
            });
            setEditing(null);
          }}
        />
      )}

      {listings.length === 0 && !editing ? (
        <Card>
          <p className="text-brand-text/70">Δεν έχεις καταχωρημένες τιμές ακόμα.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-brand-dark">{l.title || l.products.name_el}</h3>
                    {l.kind && (
                      <Badge tone={KIND_TONE[l.kind]}>{PRICE_LIST_KIND_LABEL[l.kind]}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-brand-text/60 mt-1">
                    {l.products.name_el} · Παραλαβή {l.regions?.name_el ?? l.region_code}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(l)}>
                    Επεξεργασία
                  </Button>
                  <DeleteButton id={l.id} onDeleted={() => setListings((p) => p.filter((x) => x.id !== l.id))} />
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {l.variants.map((v, i) => (
                    <tr key={i} className="border-b border-brand-border last:border-0">
                      <td className="py-1.5 text-brand-text/80">
                        {Object.entries(v.attributes)
                          .map(([k, val]) => `${k}: ${val}`)
                          .join(", ") || "—"}
                      </td>
                      <td className="py-1.5 text-right font-semibold text-brand-earth">
                        {priceFormat(Number(v.price), l.products.unit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {l.notes && <p className="mt-2 text-sm text-brand-text/70">{l.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteButton({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Διαγραφή τιμοκαταλόγου;")) return;
          const res = await deletePriceListing(id);
          if (res.ok) onDeleted();
        })
      }
    >
      <Icon name="trash" />
    </Button>
  );
}

function PriceEditor({
  products,
  regions,
  kindOptions,
  initial,
  onCancel,
  onSaved,
}: {
  products: Product[];
  regions: Region[];
  kindOptions: PriceListKind[];
  initial: Partial<ListingRow>;
  onCancel: () => void;
  onSaved: (row: ListingRow) => void;
}) {
  const [productId, setProductId] = useState<string>(initial.product_id ?? products[0]?.id ?? "");
  const [regionCode, setRegionCode] = useState<string>(initial.region_code ?? regions[0]?.code ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [kind, setKind] = useState<PriceListKind>(initial.kind ?? kindOptions[0]);
  const [title, setTitle] = useState<string>(initial.title ?? "");
  const [variants, setVariants] = useState<PriceVariant[]>(
    initial.variants && initial.variants.length > 0
      ? initial.variants
      : [{ attributes: {}, price: 0, currency: "EUR" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const product = products.find((p) => p.id === productId);
  const attrEntries = product ? Object.entries(product.attributes_schema) : [];

  return (
    <Card>
      <h3 className="font-semibold text-brand-dark mb-4">
        {initial.id ? "Επεξεργασία" : "Νέος"} τιμοκατάλογος
      </h3>
      <div className="space-y-4">
        {kindOptions.length > 1 && (
          <div>
            <Label>Τύπος τιμοκαταλόγου</Label>
            <Select value={kind} onChange={(e) => setKind(e.target.value as PriceListKind)}>
              {kindOptions.map((k) => (
                <option key={k} value={k}>{PRICE_LIST_KIND_LABEL[k]}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-brand-muted">{PRICE_LIST_KIND_HELP[kind]}</p>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Προϊόν</Label>
            <Select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setVariants([{ attributes: {}, price: 0, currency: "EUR" }]);
              }}
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name_el}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Περιοχή παραλαβής</Label>
            <Select value={regionCode} onChange={(e) => setRegionCode(e.target.value)}>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name_el}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Τιμές ανά κατηγορία ({product?.unit})</Label>
            <button
              type="button"
              onClick={() =>
                setVariants((prev) => [...prev, { attributes: {}, price: 0, currency: "EUR" }])
              }
              className="text-sm text-brand-mid hover:underline"
            >
              + Προσθήκη γραμμής
            </button>
          </div>
          <div className="space-y-2">
            {variants.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_120px_40px] gap-2 items-center">
                <div className="flex gap-2">
                  {attrEntries.map(([key, def]) =>
                    def.type === "enum" ? (
                      <Select
                        key={key}
                        value={(v.attributes[key] as string) ?? ""}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((x, xi) =>
                              xi === i
                                ? { ...x, attributes: { ...x.attributes, [key]: e.target.value } }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="">{(def as any).label}...</option>
                        {(def as any).values.map((val: string) => (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        key={key}
                        type={def.type === "number" ? "number" : "text"}
                        placeholder={(def as any).label}
                        value={String(v.attributes[key] ?? "")}
                        onChange={(e) =>
                          setVariants((prev) =>
                            prev.map((x, xi) =>
                              xi === i
                                ? {
                                    ...x,
                                    attributes: {
                                      ...x.attributes,
                                      [key]: def.type === "number" ? Number(e.target.value) : e.target.value,
                                    },
                                  }
                                : x,
                            ),
                          )
                        }
                      />
                    ),
                  )}
                  {attrEntries.length === 0 && (
                    <div className="text-sm text-brand-text/50 flex items-center px-3">
                      (καμία κατηγορία)
                    </div>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="€"
                  value={v.price || ""}
                  onChange={(e) =>
                    setVariants((prev) =>
                      prev.map((x, xi) => (xi === i ? { ...x, price: Number(e.target.value) } : x)),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setVariants((prev) => prev.filter((_, xi) => xi !== i))}
                >
                  <Icon name="trash" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Ονομασία τιμοκαταλόγου (προαιρετικό)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Ελιές Καλαμών — φθινοπωρινή σεζόν" />
        </div>

        <div>
          <Label>Σημειώσεις (προαιρετικό)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await savePriceListing({
                  id: initial.id,
                  product_id: productId,
                  region_code: regionCode,
                  notes,
                  kind,
                  title: title || undefined,
                  variants: variants.filter((v) => v.price > 0),
                });
                if (!res.ok) return setError(res.error);
                if (res.id && product) {
                  onSaved({
                    id: res.id,
                    product_id: productId,
                    kind,
                    title: title || null,
                    region_code: regionCode,
                    notes,
                    variants: variants.filter((v) => v.price > 0),
                    updated_at: new Date().toISOString(),
                    products: {
                      name_el: product.name_el,
                      unit: product.unit,
                      attributes_schema: product.attributes_schema,
                    },
                    regions: { name_el: regions.find((r) => r.code === regionCode)?.name_el ?? regionCode },
                  });
                }
              })
            }
          >
            {pending ? "Αποθήκευση..." : "Αποθήκευση"}
          </Button>
          <Button variant="secondary" type="button" onClick={onCancel}>
            Ακύρωση
          </Button>
        </div>
      </div>
    </Card>
  );
}
