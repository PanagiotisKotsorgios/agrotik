"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { saveProductionListing, deleteProductionListing } from "@/lib/actions/listings";
import type { Product, Region, AttributesSchema } from "@/lib/db/types";
import { Icon } from "@/components/ui/icon";
import { formatQuantity } from "@/lib/utils";

interface Row {
  id: string;
  product_id: string;
  region_code: string;
  quantity: number;
  unit: string | null;
  attributes: Record<string, string | number>;
  available_from: string | null;
  available_until: string | null;
  notes?: string | null;
  title?: string | null;
  updated_at: string;
  products: { name_el: string; unit: string; attributes_schema: AttributesSchema };
  regions: { name_el: string };
}

export function ProductionListingsManager({
  initialListings,
  products,
  regions,
}: {
  initialListings: Row[];
  products: Product[];
  regions: Region[];
}) {
  const [listings, setListings] = useState(initialListings);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);

  return (
    <div className="space-y-4">
      {!editing && (
        <Button onClick={() => setEditing({})} className="inline-flex items-center gap-2">
          <Icon name="plus" /> Νέα καταχώρηση παραγωγής
        </Button>
      )}

      {editing && (
        <Editor
          products={products}
          regions={regions}
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={(row) => {
            setListings((prev) => [row, ...prev.filter((l) => l.id !== row.id)]);
            setEditing(null);
          }}
        />
      )}

      {listings.length === 0 && !editing ? (
        <Card>
          <p className="text-brand-text/70">Δεν έχεις καταχωρήσει παραγωγή ακόμα.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((l) => (
            <Card key={l.id}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-brand-dark">{l.products.name_el}</h3>
                  <div className="text-lg font-bold text-brand-earth mt-1">
                    {formatQuantity(l.quantity, l.unit ?? l.products.unit)}
                  </div>
                  {Object.keys(l.attributes ?? {}).length > 0 && (
                    <div className="text-xs text-brand-text/60 mt-1">
                      {Object.entries(l.attributes)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(", ")}
                    </div>
                  )}
                  <div className="text-xs text-brand-text/60 mt-1">
                    Περιοχή: {l.regions?.name_el ?? l.region_code}
                  </div>
                  {(l.available_from || l.available_until) && (
                    <div className="text-xs text-brand-text/60 mt-1">
                      Διαθέσιμο: {l.available_from ?? "τώρα"} – {l.available_until ?? "ανοιχτό"}
                    </div>
                  )}
                  {l.notes && (
                    <p className="mt-2 text-sm text-brand-text/80 italic border-l-2 border-brand-earth/40 pl-3">{l.notes}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setEditing(l)}>
                    Επεξεργασία
                  </Button>
                  <DeleteBtn id={l.id} onDeleted={() => setListings((p) => p.filter((x) => x.id !== l.id))} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DeleteBtn({ id, onDeleted }: { id: string; onDeleted: () => void }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          if (!confirm("Διαγραφή;")) return;
          const res = await deleteProductionListing(id);
          if (res.ok) onDeleted();
        })
      }
    >
      <Icon name="trash" />
    </Button>
  );
}

function Editor({
  products,
  regions,
  initial,
  onCancel,
  onSaved,
}: {
  products: Product[];
  regions: Region[];
  initial: Partial<Row>;
  onCancel: () => void;
  onSaved: (row: Row) => void;
}) {
  const [productId, setProductId] = useState(initial.product_id ?? products[0]?.id ?? "");
  const [regionCode, setRegionCode] = useState(initial.region_code ?? regions[0]?.code ?? "");
  const [quantity, setQuantity] = useState<number>(Number(initial.quantity ?? 0));
  const [attributes, setAttributes] = useState<Record<string, string | number>>(initial.attributes ?? {});
  const [availableFrom, setAvailableFrom] = useState(initial.available_from ?? "");
  const [availableUntil, setAvailableUntil] = useState(initial.available_until ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [title, setTitle] = useState(initial.title ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const product = products.find((p) => p.id === productId);
  const attrEntries = product ? Object.entries(product.attributes_schema) : [];

  return (
    <Card>
      <h3 className="font-semibold text-brand-dark mb-4">
        {initial.id ? "Επεξεργασία" : "Νέα"} παραγωγή
      </h3>
      <div className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Προϊόν</Label>
            <Select
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setAttributes({});
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
            <Label>Περιοχή</Label>
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
          <Label>Ποσότητα ({product?.unit})</Label>
          <Input type="number" min="0" step="0.01" value={quantity || ""} onChange={(e) => setQuantity(Number(e.target.value))} />
        </div>

        {attrEntries.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {attrEntries.map(([key, def]) => (
              <div key={key}>
                <Label>{(def as any).label}</Label>
                {def.type === "enum" ? (
                  <Select
                    value={(attributes[key] as string) ?? ""}
                    onChange={(e) => setAttributes((a) => ({ ...a, [key]: e.target.value }))}
                  >
                    <option value="">—</option>
                    {(def as any).values.map((v: string) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    type={def.type === "number" ? "number" : "text"}
                    value={String(attributes[key] ?? "")}
                    onChange={(e) =>
                      setAttributes((a) => ({
                        ...a,
                        [key]: def.type === "number" ? Number(e.target.value) : e.target.value,
                      }))
                    }
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Διαθέσιμο από</Label>
            <Input type="date" value={availableFrom ?? ""} onChange={(e) => setAvailableFrom(e.target.value)} />
          </div>
          <div>
            <Label>Έως</Label>
            <Input type="date" value={availableUntil ?? ""} onChange={(e) => setAvailableUntil(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Ονομασία καταχώρησης (προαιρετικό)</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="π.χ. Ελιές Καλαμών — πρώτης ποιότητας" />
        </div>

        <div>
          <Label>Σημειώσεις / περιγραφή (προαιρετικό)</Label>
          <Textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="π.χ. Βιολογικές, χωρίς φυτοφάρμακα. Παραλαβή από το χωράφι ή το ελαιοτριβείο. Διαπραγματεύσιμη τιμή για μεγάλες ποσότητες."
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-2">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await saveProductionListing({
                  id: initial.id,
                  product_id: productId,
                  region_code: regionCode,
                  quantity,
                  attributes,
                  available_from: availableFrom || null,
                  available_until: availableUntil || null,
                  notes: notes || undefined,
                  title: title || undefined,
                });
                if (!res.ok) return setError(res.error);
                if (res.id && product) {
                  onSaved({
                    id: res.id,
                    product_id: productId,
                    region_code: regionCode,
                    quantity,
                    unit: null,
                    attributes,
                    available_from: availableFrom || null,
                    available_until: availableUntil || null,
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
