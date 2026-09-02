"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { recordDeal } from "@/lib/actions/deals";

export function DealButton({
  targetId,
  products,
  initialRecorded,
}: {
  targetId: string;
  products: Array<{ id: string; name: string }>;
  initialRecorded: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [recorded, setRecorded] = useState(initialRecorded);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (recorded) {
    return (
      <div className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2" role="status">
        <Icon name="ok" /> Η συμφωνία καταγράφηκε
      </div>
    );
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" icon="check" onClick={() => setOpen(true)}>
        Σημείωσε συμφωνία
      </Button>
    );
  }

  return (
    <div className="w-full sm:w-72 rounded-lg border border-brand-border bg-brand-bg p-3 space-y-2">
      <div className="text-sm font-semibold text-brand-dark">Καταγραφή πώλησης</div>
      {products.length > 0 && (
        <Select value={productId} onChange={(event) => setProductId(event.target.value)} aria-label="Προϊόν συμφωνίας">
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </Select>
      )}
      <p className="text-xs text-brand-muted">Καταγράφεται μόνο ότι έγινε συμφωνία, χωρίς ποσό ή προσωπικούς όρους.</p>
      {error && <p className="text-xs text-red-700" role="alert">{error}</p>}
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          icon={pending ? "spinner" : "check"}
          disabled={pending}
          onClick={() => start(async () => {
            setError(null);
            const result = await recordDeal({ target_id: targetId, product_id: productId || null });
            if (!result.ok) return setError(result.error);
            setRecorded(true);
          })}
        >
          {pending ? "Καταγραφή…" : "Επιβεβαίωση"}
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Ακύρωση
        </Button>
      </div>
    </div>
  );
}
