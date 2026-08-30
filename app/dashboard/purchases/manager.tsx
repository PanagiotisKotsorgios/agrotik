"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { savePurchase, deletePurchase } from "@/lib/actions/purchases";
import type { Product } from "@/lib/db/types";

interface Farmer {
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
  farmers,
  products,
  defaultSeason,
}: {
  initialPurchases: Row[];
  farmers: Farmer[];
  products: Product[];
  defaultSeason: string;
}) {
  const [rows, setRows] = useState(initialPurchases);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="eyebrow">Καταχωρήσεις</div>
          <h2 className="display text-xl text-brand-dark">Ιστορικό αγορών</h2>
        </div>
        {!adding && (
          <Button icon="plus" onClick={() => setAdding(true)}>
            Νέα αγορά
          </Button>
        )}
      </div>

      {adding && (
        <form
          className="grid sm:grid-cols-2 gap-3 mb-6 p-4 rounded-md border border-brand-dark/20 bg-brand-bg/40"
          action={(fd) =>
            start(async () => {
              setMessage(null);
              const res = await savePurchase(fd);
              if (!res.ok) return setMessage({ ok: false, text: res.error });
              setMessage({ ok: true, text: "Αποθηκεύτηκε" });
              setAdding(false);
              router.refresh();
            })
          }
        >
          <div className="sm:col-span-2">
            <Label>Παραγωγός</Label>
            <Select name="farmer_id" required defaultValue="">
              <option value="" disabled>— Επίλεξε παραγωγό —</option>
              {farmers.map((f) => (
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
            <Select name="product_id" required defaultValue="" onChange={(e) => {
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
            <Input name="season" required defaultValue={defaultSeason} placeholder="π.χ. 2026-2027" />
          </div>
          <div>
            <Label>Ποσότητα</Label>
            <Input type="number" step="0.01" min="0" name="quantity" required />
          </div>
          <div>
            <Label>Μονάδα</Label>
            <Input id="purchase-unit" name="unit" required placeholder="κιλό / λίτρο / τόνος" />
          </div>
          <div>
            <Label>Τιμή/μονάδα (€) — προαιρετικό</Label>
            <Input type="number" step="0.01" min="0" name="price_per_unit" />
          </div>
          <div>
            <Label>Ημερομηνία αγοράς</Label>
            <Input type="date" name="purchased_at" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="sm:col-span-2">
            <Label>Σημειώσεις</Label>
            <Textarea name="notes" rows={2} />
          </div>
          {message && (
            <p className={"sm:col-span-2 inline-flex items-center gap-2 text-sm " +
              (message.ok ? "text-emerald-700" : "text-red-700")}>
              <Icon name={message.ok ? "ok" : "triangleAlert"} /> {message.text}
            </p>
          )}
          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(false)}>Ακύρωση</Button>
            <Button type="submit" disabled={pending} icon={pending ? "spinner" : "check"}>
              {pending ? "Αποθήκευση…" : "Αποθήκευση"}
            </Button>
          </div>
        </form>
      )}

      {rows.length === 0 ? (
        <p className="text-brand-muted text-[15px] inline-flex items-center gap-2">
          <Icon name="info" /> Δεν έχεις καταχωρημένες αγορές ακόμα.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-brand-border eyebrow text-brand-muted">
                <th className="py-2 pr-3">Ημερομηνία</th>
                <th className="py-2 pr-3">Παραγωγός</th>
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
                  <td className="py-2.5 pr-3 figures text-brand-muted whitespace-nowrap">{r.purchased_at}</td>
                  <td className="py-2.5 pr-3 font-medium text-brand-dark">{r.profiles.display_name}</td>
                  <td className="py-2.5 pr-3">{r.products.name_el}</td>
                  <td className="py-2.5 pr-3 text-right figures">
                    {r.quantity} {r.unit}
                  </td>
                  <td className="py-2.5 pr-3 text-right figures">
                    {r.price_per_unit != null ? `${Number(r.price_per_unit).toFixed(2)} €` : "—"}
                  </td>
                  <td className="py-2.5 pr-3"><Badge tone="muted">{r.season}</Badge></td>
                  <td className="py-2.5 text-right">
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
                      className="text-brand-muted hover:text-red-700 p-2 -m-2"
                      aria-label="Διαγραφή"
                    >
                      <Icon name="trash" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
