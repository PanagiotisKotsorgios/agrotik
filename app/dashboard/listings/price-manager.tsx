"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { savePriceListing, deletePriceListing } from "@/lib/actions/listings";
import { createSupplierProduct } from "@/lib/actions/products";
import { PhotoUploadButton } from "@/components/site/photo-upload-button";
import type { Product, Region, PriceVariant, AttributesSchema, PriceListKind, GalleryItem } from "@/lib/db/types";
import { PRICE_LIST_KIND_LABEL, PRICE_LIST_KIND_HELP } from "@/lib/db/types";
import { attributeLabel, priceFormat } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/card";

interface ListingRow {
  id: string;
  product_id: string;
  kind?: PriceListKind;
  title?: string | null;
  region_code: string;
  notes: string | null;
  description?: string | null;
  gallery?: GalleryItem[];
  variants: PriceVariant[];
  updated_at: string;
  products: { name_el: string; unit: string; attributes_schema: AttributesSchema };
  regions: { name_el: string };
}

function slugify(input: string): string {
  const trans: Record<string, string> = {
    ά: "a", έ: "e", ή: "h", ί: "i", ό: "o", ύ: "y", ώ: "w",
    α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "h", θ: "th",
    ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
    ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "w",
    ϊ: "i", ϋ: "y", ΐ: "i", ΰ: "y",
  };
  const lower = input.trim().toLowerCase();
  let out = "";
  for (const ch of lower) out += trans[ch] ?? ch;
  return out
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const KIND_OPTIONS_BY_ROLE: Record<"merchant" | "factory" | "agri_supplier", PriceListKind[]> = {
  merchant: ["buy_from_producer", "sell_wholesale", "sell_retail"],
  factory: ["buy_from_producer", "buy_from_merchant", "sell_wholesale", "sell_retail"],
  // Suppliers sell products retail OR rent out equipment
  // (τιναχτήρια, ψεκαστικά, μηχανήματα …). Never buy from farms.
  agri_supplier: ["sell_retail", "rent_supply"],
};

const KIND_TONE: Record<PriceListKind, "brand" | "olive" | "warn" | "muted"> = {
  buy_from_producer: "brand",
  buy_from_merchant: "olive",
  sell_wholesale: "warn",
  sell_retail: "muted",
  rent_supply: "warn",
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
  role?: "merchant" | "factory" | "agri_supplier";
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
                          .map(([k, val]) => `${attributeLabel(k)}: ${val}`)
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
  const [availableProducts, setAvailableProducts] = useState<Product[]>(products);
  const [productId, setProductId] = useState<string>(initial.product_id ?? products[0]?.id ?? "");
  const [regionCode, setRegionCode] = useState<string>(initial.region_code ?? regions[0]?.code ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [description, setDescription] = useState<string>(initial.description ?? "");
  const [gallery, setGallery] = useState<GalleryItem[]>(
    Array.isArray(initial.gallery) ? initial.gallery : [],
  );
  const [kind, setKind] = useState<PriceListKind>(initial.kind ?? kindOptions[0]);
  const [title, setTitle] = useState<string>(initial.title ?? "");
  const [variants, setVariants] = useState<PriceVariant[]>(
    initial.variants && initial.variants.length > 0
      ? initial.variants
      : [{ attributes: {}, price: 0, currency: "EUR" }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [newProductOpen, setNewProductOpen] = useState(false);

  const product = availableProducts.find((p) => p.id === productId);
  const attrEntries = product ? Object.entries(product.attributes_schema) : [];
  const categories = Array.from(new Set(availableProducts.map((p) => p.category))).sort((a, b) =>
    a.localeCompare(b, "el"),
  );

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
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Προϊόν</Label>
              <button
                type="button"
                className="text-xs text-brand-mid hover:underline"
                onClick={() => setNewProductOpen((prev) => !prev)}
              >
                {newProductOpen ? "Ακύρωση νέου προϊόντος" : "+ Νέο προϊόν"}
              </button>
            </div>
            <Select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setVariants([{ attributes: {}, price: 0, currency: "EUR" }]);
              }}
            >
              {availableProducts.map((p) => (
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

        {newProductOpen && (
          <NewProductPanel
            defaultCategory={product?.category ?? categories[0] ?? ""}
            categories={categories}
            onCreated={(created) => {
              setAvailableProducts((prev) => [...prev, created]);
              setProductId(created.id);
              setVariants([{ attributes: {}, price: 0, currency: "EUR" }]);
              setNewProductOpen(false);
            }}
            onCancel={() => setNewProductOpen(false)}
          />
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>
              {kind === "rent_supply"
                ? "Τιμές ενοικίασης"
                : `Τιμές ανά κατηγορία (${product?.unit})`}
            </Label>
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
                  {kind === "rent_supply" && (
                    <Select
                      value={String(v.attributes["period"] ?? "")}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((x, xi) =>
                            xi === i
                              ? { ...x, attributes: { ...x.attributes, period: e.target.value } }
                              : x,
                          ),
                        )
                      }
                    >
                      <option value="">Χρέωση ανά…</option>
                      <option value="ημέρα">ημέρα</option>
                      <option value="εβδομάδα">εβδομάδα</option>
                      <option value="μήνα">μήνα</option>
                      <option value="έτος">έτος</option>
                      <option value="εργασία">εργασία</option>
                      <option value="στρέμμα">στρέμμα</option>
                      <option value="ώρα">ώρα</option>
                    </Select>
                  )}
                  {attrEntries.length === 0 && kind !== "rent_supply" && (
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
          <Label>Περιγραφή προϊόντος (προαιρετικό)</Label>
          <Textarea
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            placeholder="Λεπτομέρειες που θα δει ο αγοραστής στην αναλυτική σελίδα (χρήση, ιδιότητες, οδηγίες...)"
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <Label className="mb-0">Φωτογραφίες — προαιρετικό</Label>
            <div className="flex flex-wrap items-center gap-2">
              {gallery.length < 12 && (
                <PhotoUploadButton
                  disabled={gallery.length >= 12}
                  onUploaded={({ url }) =>
                    setGallery((prev) => (prev.length >= 12 ? prev : [...prev, { url, alt: "" }]))
                  }
                />
              )}
              {gallery.length < 12 && (
                <button
                  type="button"
                  onClick={() => setGallery((prev) => [...prev, { url: "", alt: "" }])}
                  className="text-sm text-brand-mid hover:underline"
                >
                  + Επικόλληση URL
                </button>
              )}
            </div>
          </div>
          <p className="mb-2 text-xs text-brand-muted">
            Ανέβασε φωτογραφία (JPEG / PNG / WEBP, έως 5 MB) ή επικόλλησε δημόσιο URL. Μέχρι 12 φωτογραφίες ανά καταχώρηση.
          </p>
          <div className="space-y-2">
            {gallery.map((g, i) => {
              const trimmed = (g.url ?? "").trim();
              const looksLikeUrl = /^https?:\/\//i.test(trimmed);
              const move = (from: number, to: number) =>
                setGallery((prev) => {
                  if (to < 0 || to >= prev.length || from === to) return prev;
                  const next = prev.slice();
                  const [row] = next.splice(from, 1);
                  next.splice(to, 0, row);
                  return next;
                });
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", String(i));
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const from = Number(e.dataTransfer.getData("text/plain"));
                    if (Number.isFinite(from)) move(from, i);
                  }}
                  className="grid grid-cols-[24px_72px_1fr_40px] sm:grid-cols-[24px_72px_1fr_1fr_40px] gap-2 items-center rounded-md hover:bg-brand-bg/50"
                >
                  <div className="flex flex-col items-center gap-0.5 text-brand-muted">
                    <button
                      type="button"
                      onClick={() => move(i, i - 1)}
                      disabled={i === 0}
                      aria-label="Μετακίνηση πάνω"
                      className="text-xs leading-none px-1 py-0.5 rounded hover:bg-brand-border/60 disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <span
                      className="cursor-grab active:cursor-grabbing select-none"
                      aria-label={`Σειρά ${i + 1}. Σύρε για αλλαγή σειράς.`}
                      title="Σύρε για αλλαγή σειράς"
                    >
                      ⋮⋮
                    </span>
                    <button
                      type="button"
                      onClick={() => move(i, i + 1)}
                      disabled={i === gallery.length - 1}
                      aria-label="Μετακίνηση κάτω"
                      className="text-xs leading-none px-1 py-0.5 rounded hover:bg-brand-border/60 disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>
                  <div className="relative w-[72px] h-[72px] rounded-md overflow-hidden bg-brand-bg border border-brand-border flex items-center justify-center text-brand-muted">
                    {looksLikeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={trimmed}
                        alt={g.alt ?? ""}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <Icon name="image" />
                    )}
                    {i === 0 && looksLikeUrl && (
                      <span className="absolute bottom-0 inset-x-0 bg-brand-dark/80 text-white text-[10px] py-0.5 text-center font-semibold">
                        Κύρια
                      </span>
                    )}
                  </div>
                  <Input
                    type="url"
                    placeholder="https://…/photo.jpg"
                    value={g.url}
                    onChange={(e) =>
                      setGallery((prev) => prev.map((x, xi) => (xi === i ? { ...x, url: e.target.value } : x)))
                    }
                  />
                  <Input
                    type="text"
                    placeholder="Λεζάντα (προαιρετικά)"
                    maxLength={200}
                    value={g.alt ?? ""}
                    onChange={(e) =>
                      setGallery((prev) => prev.map((x, xi) => (xi === i ? { ...x, alt: e.target.value } : x)))
                    }
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setGallery((prev) => prev.filter((_, xi) => xi !== i))}
                    aria-label="Διαγραφή φωτογραφίας"
                  >
                    <Icon name="trash" />
                  </Button>
                </div>
              );
            })}
            {gallery.length > 1 && (
              <p className="text-xs text-brand-muted">
                Σύρε τις γραμμές ή χρησιμοποίησε τα βέλη για να αλλάξεις σειρά. Η πρώτη φωτογραφία γίνεται η κύρια εικόνα του προϊόντος.
              </p>
            )}
          </div>
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
                const cleanGallery = gallery
                  .filter((g) => g.url.trim().length > 0)
                  .map((g) => ({ url: g.url.trim(), alt: (g.alt ?? "").trim() || undefined }));
                const res = await savePriceListing({
                  id: initial.id,
                  product_id: productId,
                  region_code: regionCode,
                  notes,
                  description: description.trim() || undefined,
                  gallery: cleanGallery,
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
                    description: description.trim() || null,
                    gallery: cleanGallery,
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

function NewProductPanel({
  defaultCategory,
  categories,
  onCreated,
  onCancel,
}: {
  defaultCategory: string;
  categories: string[];
  onCreated: (created: Product) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState<string>(defaultCategory);
  const [customCategory, setCustomCategory] = useState("");
  const [unit, setUnit] = useState("τεμάχιο");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-xl border border-brand-mid/40 bg-brand-bg/60 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-brand-dark inline-flex items-center gap-2">
          <Icon name="plus" /> Νέο προϊόν στον κατάλογο
        </div>
        <Badge tone="muted">Χωρίς έγκριση admin</Badge>
      </div>
      <p className="text-xs text-brand-muted">
        Το προϊόν γίνεται ενεργό αμέσως. Ο admin μπορεί να το αφαιρέσει αν κάτι είναι λάθος.
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Όνομα προϊόντος</Label>
          <Input
            value={name}
            maxLength={120}
            required
            onChange={(e) => {
              const v = e.target.value;
              setName(v);
              if (!slug) setSlug(slugify(v));
            }}
            placeholder="π.χ. Compo Nitrophoska Special 12-12-17+2"
          />
        </div>
        <div>
          <Label>Slug (μοναδικό ID)</Label>
          <Input
            value={slug}
            required
            maxLength={80}
            pattern="[a-z0-9][a-z0-9_\-]*"
            onChange={(e) => setSlug(slugify(e.target.value))}
            placeholder="compo-nitrophoska-12-12-17"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Κατηγορία</Label>
          <Select
            value={category === "__new__" ? "__new__" : category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
            <option value="__new__">+ Νέα κατηγορία…</option>
          </Select>
          {category === "__new__" && (
            <Input
              className="mt-2"
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              maxLength={80}
              placeholder="Όνομα νέας κατηγορίας"
            />
          )}
        </div>
        <div>
          <Label>Μονάδα μέτρησης</Label>
          <Input
            value={unit}
            required
            maxLength={20}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="κιλό, λίτρο, τεμάχιο, στρέμμα…"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>Ακύρωση</Button>
        <Button
          type="button"
          disabled={pending}
          icon={pending ? "spinner" : "check"}
          onClick={() =>
            start(async () => {
              setError(null);
              const finalCategory = category === "__new__" ? customCategory.trim() : category.trim();
              const res = await createSupplierProduct({
                name_el: name.trim(),
                slug: slugify(slug),
                category: finalCategory,
                unit: unit.trim(),
              });
              if (!res.ok) return setError(res.error);
              if (!res.id) return setError("Άγνωστο σφάλμα δημιουργίας");
              onCreated({
                id: res.id,
                slug: res.slug!,
                name_el: name.trim(),
                category: finalCategory,
                unit: unit.trim(),
                attributes_schema: {},
                status: "active",
                proposed_by: null,
                created_at: new Date().toISOString(),
              });
            })
          }
        >
          Δημιουργία & επιλογή
        </Button>
      </div>
    </div>
  );
}
