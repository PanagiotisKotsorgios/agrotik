"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { savePurchase, deletePurchase } from "@/lib/actions/purchases";
import type { Product } from "@/lib/db/types";
import { formatCurrency, formatDate, formatQuantity } from "@/lib/utils";

interface Producer {
  id: string;
  display_name: string;
  municipality?: string | null;
  regions?: { name_el: string } | null;
}

interface Row {
  id: string;
  farmer_id: string;
  product_id: string;
  season: string;
  quantity: number;
  unit: string;
  price_per_unit: number | null;
  purchased_at: string;
  notes: string | null;
  profiles: { id: string; display_name: string };
  products: { name_el: string; unit: string };
}

export function PurchasesManager({
  initialPurchases,
  producers,
  products,
  defaultSeason,
}: {
  initialPurchases: Row[];
  producers: Producer[];
  products: Product[];
  defaultSeason: string;
}) {
  const [rows, setRows] = useState(initialPurchases);
  const [editing, setEditing] = useState<Partial<Row> | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  useEffect(() => setRows(initialPurchases), [initialPurchases]);

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="eyebrow">Καταχωρήσεις</div>
          <h2 className="display text-xl text-brand-dark">Ιστορικό αγορών</h2>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {rows.length > 0 && (
            <Button variant="outline" icon="download" onClick={() => downloadPurchasesCsv(rows)}>
              Εξαγωγή CSV
            </Button>
          )}
          {!editing && (
            <Button icon="plus" onClick={() => setEditing({})}>
              Νέα αγορά
            </Button>
          )}
        </div>
      </div>

      {editing && (
        <form
          key={editing.id ?? "new"}
          className="grid sm:grid-cols-2 gap-3 mb-6 p-4 rounded-md border border-brand-dark/20 bg-brand-bg/40"
          action={(fd) =>
            start(async () => {
              setMessage(null);
              const res = await savePurchase(fd);
              if (!res.ok) return setMessage({ ok: false, text: res.error });
              setMessage({ ok: true, text: editing.id ? "Η αγορά ενημερώθηκε" : "Η αγορά αποθηκεύτηκε" });
              setEditing(null);
              router.refresh();
            })
          }
        >
          {editing.id && <input type="hidden" name="id" value={editing.id} />}
          <div className="sm:col-span-2">
            <Label>Παραγωγός / αλιέας</Label>
            <Select name="farmer_id" required defaultValue={editing.farmer_id ?? ""}>
              <option value="" disabled>— Επίλεξε παραγωγό ή αλιέα —</option>
              {producers.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.display_name}
                  {f.regions?.name_el ? ` · ${f.regions.name_el}` : ""}
                  {f.municipality ? ` · ${f.municipality}` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Προϊόν</Label>
            <Select name="product_id" required defaultValue={editing.product_id ?? ""} onChange={(e) => {
              const p = products.find((x) => x.id === e.target.value);
              const u = (document.getElementById("purchase-unit") as HTMLInputElement | null);
              if (u && p) u.value = p.unit;
            }}>
              <option value="" disabled>—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name_el}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Σεζόν</Label>
            <Input name="season" required defaultValue={editing.season ?? defaultSeason} placeholder="π.χ. 2026-2027" />
          </div>
          <div>
            <Label>Ποσότητα</Label>
            <Input type="number" step="0.01" min="0.01" name="quantity" required defaultValue={editing.quantity ?? ""} />
          </div>
          <div>
            <Label>Μονάδα</Label>
            <Input id="purchase-unit" name="unit" required placeholder="κιλό / λίτρο / τόνος" defaultValue={editing.unit ?? ""} />
          </div>
          <div>
            <Label>Τιμή/μονάδα (€) — προαιρετικό</Label>
            <Input type="number" step="0.01" min="0" name="price_per_unit" defaultValue={editing.price_per_unit ?? ""} />
          </div>
          <div>
            <Label>Ημερομηνία αγοράς</Label>
            <Input type="date" name="purchased_at" defaultValue={editing.purchased_at ?? new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Σημειώσεις</Label>
            <Textarea name="notes" rows={2} defaultValue={editing.notes ?? ""} />
          </div>
          {message && (
            <p className={"sm:col-span-2 inline-flex items-center gap-2 text-sm " +
              (message.ok ? "text-emerald-700" : "text-red-700")}>
              <Icon name={message.ok ? "ok" : "triangleAlert"} /> {message.text}
            </p>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setEditing(null)}>Ακύρωση</Button>
            <Button type="submit" disabled={pending} icon={pending ? "spinner" : "check"}>
              {pending ? "Αποθήκευση…" : editing.id ? "Ενημέρωση" : "Αποθήκευση"}
            </Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-brand-muted text-[15px] inline-flex items-center gap-2">
          <Icon name="info" /> Δεν έχεις καταχωρημένες αγορές ακόμα.
        </p>
      ) : (
        <>
        <ul className="md:hidden space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-xl border border-brand-border bg-white p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-medium text-brand-dark truncate">{r.profiles.display_name}</div>
                  <div className="text-sm text-brand-muted truncate">{r.products.name_el}</div>
                </div>
                <Badge tone="muted">{r.season}</Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="eyebrow text-brand-muted">Ημερομηνία</div>
                  <div className="figures text-brand-dark">{formatDate(r.purchased_at)}</div>
                </div>
                <div>
                  <div className="eyebrow text-brand-muted">Ποσότητα</div>
                  <div className="figures text-brand-dark">{formatQuantity(r.quantity, r.unit)}</div>
                </div>
                <div className="col-span-2">
                  <div className="eyebrow text-brand-muted">Τιμή</div>
                  <div className="figures text-brand-dark">{r.price_per_unit != null ? formatCurrency(r.price_per_unit) : "—"}</div>
                </div>
              </div>
              <div className="mt-2 flex justify-end gap-1">
                <button
                  type="button"
                  onClick={() => { setMessage(null); setEditing(r); }}
                  className="text-brand-muted hover:text-brand-dark p-2"
                  aria-label="Επεξεργασία"
                >
                  <Icon name="edit" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    start(async () => {
                      if (!confirm("Διαγραφή αγοράς;")) return;
                      const res = await deletePurchase(r.id);
                      if (res.ok) setRows((prev) => prev.filter((x) => x.id !== r.id));
                    })
                  }
                  disabled={pending}
                  className="text-brand-muted hover:text-red-700 p-2"
                  aria-label="Διαγραφή"
                >
                  <Icon name="trash" />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-brand-border eyebrow text-brand-muted">
                <th className="py-2 pr-3">Ημερομηνία</th>
                <th className="py-2 pr-3">Παραγωγός / αλιέας</th>
                <th className="py-2 pr-3">Προϊόν</th>
                <th className="py-2 pr-3 text-right">Ποσότητα</th>
                <th className="py-2 pr-3 text-right">Τιμή</th>
                <th className="py-2 pr-3">Σεζόν</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-brand-border last:border-0">
                  <td className="py-2.5 pr-3 figures text-brand-muted whitespace-nowrap">{formatDate(r.purchased_at)}</td>
                  <td className="py-2.5 pr-3 font-medium text-brand-dark">{r.profiles.display_name}</td>
                  <td className="py-2.5 pr-3">{r.products.name_el}</td>
                  <td className="py-2.5 pr-3 text-right figures">
                    {formatQuantity(r.quantity, r.unit)}
                  </td>
                  <td className="py-2.5 pr-3 text-right figures">
                    {r.price_per_unit != null ? formatCurrency(r.price_per_unit) : "—"}
                  </td>
                  <td className="py-2.5 pr-3"><Badge tone="muted">{r.season}</Badge></td>
                  <td className="py-2.5 text-right">
                    <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setMessage(null);
                        setEditing(r);
                      }}
                      className="text-brand-muted hover:text-brand-dark p-2"
                      aria-label="Επεξεργασία"
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        start(async () => {
                          if (!confirm("Διαγραφή αγοράς;")) return;
                          const res = await deletePurchase(r.id);
                          if (res.ok) setRows((prev) => prev.filter((x) => x.id !== r.id));
                        })
                      }
                      disabled={pending}
                      className="text-brand-muted hover:text-red-700 p-2"
                      aria-label="Διαγραφή"
                    >
                      <Icon name="trash" />
                    </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
    </Card>
  );
}

function downloadPurchasesCsv(rows: Row[]) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const header = ["Ημερομηνία", "Παραγωγός / αλιέας", "Προϊόν", "Ποσότητα", "Μονάδα", "Τιμή ανά μονάδα", "Σεζόν", "Σημειώσεις"];
  const lines = rows.map((row) => [
    row.purchased_at,
    row.profiles.display_name,
    row.products.name_el,
    row.quantity,
    row.unit,
    row.price_per_unit ?? "",
    row.season,
    row.notes ?? "",
  ].map(escape).join(","));
  const blob = new Blob(["\uFEFF", header.map(escape).join(","), "\n", lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `agrotik-agores-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
