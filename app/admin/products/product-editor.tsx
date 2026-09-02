"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { createProduct, updateProduct, setProductStatus } from "@/lib/actions/admin";

export interface ProductRow {
  id: string;
  slug: string;
  name_el: string;
  category: string;
  unit: string;
  attributes_schema: Record<string, unknown> | null;
  status: "active" | "pending" | "rejected";
}

export function AddProductButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" icon="plus" onClick={() => setOpen(true)}>
        Νέο προϊόν
      </Button>
      {open && <ProductForm onClose={() => setOpen(false)} />}
    </>
  );
}

export function EditProductButton({ product }: { product: ProductRow }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant="secondary" size="sm" icon="edit" onClick={() => setOpen(true)}>
        Επεξεργασία
      </Button>
      {open && <ProductForm product={product} onClose={() => setOpen(false)} />}
    </>
  );
}

export function DeactivateButton({ id, status }: { id: string; status: ProductRow["status"] }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const nextStatus = status === "active" ? "rejected" : "active";
  return (
    <>
      <Button
        type="button"
        variant={status === "active" ? "outline" : "primary"}
        size="sm"
        icon={status === "active" ? "eyeOff" : "eye"}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await setProductStatus(id, nextStatus);
            if (!res.ok) return setError(res.error);
            router.refresh();
          })
        }
      >
        {status === "active" ? "Απενεργοποίηση" : "Επαναφορά"}
      </Button>
      {error && <p className="w-full text-xs text-red-700" role="alert">{error}</p>}
    </>
  );
}

function ProductForm({ product, onClose }: { product?: ProductRow; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={product ? "Επεξεργασία προϊόντος" : "Νέο προϊόν"}>
      <form
        className="w-full max-w-lg bg-white rounded-2xl border border-brand-border p-5 max-h-[90vh] overflow-y-auto"
        onSubmit={(event) => {
          event.preventDefault();
          const fd = new FormData(event.currentTarget);
          start(async () => {
            setError(null);
            const res = product
              ? await updateProduct(product.id, fd)
              : await createProduct(fd);
            if (!res.ok) return setError(res.error);
            router.refresh();
            onClose();
          });
        }}
      >
        <h2 className="display text-xl text-brand-dark">
          {product ? "Επεξεργασία προϊόντος" : "Νέο προϊόν"}
        </h2>

        <div className="mt-4 grid gap-3">
          <div>
            <Label htmlFor="p-name">Όνομα (ελληνικά)</Label>
            <Input id="p-name" name="name_el" defaultValue={product?.name_el ?? ""} required maxLength={120} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-slug">Slug</Label>
              <Input id="p-slug" name="slug" defaultValue={product?.slug ?? ""} required pattern="[a-z0-9][a-z0-9_-]*" maxLength={80} />
            </div>
            <div>
              <Label htmlFor="p-unit">Μονάδα</Label>
              <Input id="p-unit" name="unit" defaultValue={product?.unit ?? "kg"} required maxLength={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-category">Κατηγορία</Label>
              <Input id="p-category" name="category" defaultValue={product?.category ?? ""} required maxLength={60} />
            </div>
            <div>
              <Label htmlFor="p-status">Κατάσταση</Label>
              <Select id="p-status" name="status" defaultValue={product?.status ?? "active"}>
                <option value="active">Ενεργό</option>
                <option value="pending">Εκκρεμεί</option>
                <option value="rejected">Απορρίφθηκε</option>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="p-attrs">Attributes schema (JSON)</Label>
            <Textarea
              id="p-attrs"
              name="attributes_schema"
              rows={4}
              defaultValue={product?.attributes_schema ? JSON.stringify(product.attributes_schema, null, 2) : "{}"}
              className="font-mono text-xs"
            />
            <p className="text-xs text-brand-muted mt-1">
              π.χ. {"{ \"variety\": [\"koroneiki\", \"kalamata\"] }"}
            </p>
          </div>
        </div>

        {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Άκυρο</Button>
          <Button type="submit" icon={pending ? "spinner" : "check"} disabled={pending}>
            {product ? "Αποθήκευση" : "Δημιουργία"}
          </Button>
        </div>
      </form>
    </div>
  );
}
