import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProductActions } from "./product-actions";
import { AddProductButton, EditProductButton, DeactivateButton } from "./product-editor";
import Link from "next/link";
import { attributeLabel } from "@/lib/utils";

export default async function AdminProducts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const status = (params.status as "active" | "pending" | "rejected") || "active";
  const svc = createSupabaseService();

  const { data: products } = await svc
    .from("products")
    .select("*, proposer:profiles!products_proposed_by_fkey(display_name)")
    .eq("status", status)
    .order("name_el");

  const filters = [
    { v: "active", l: "Ενεργά" },
    { v: "pending", l: "Εκκρεμούν" },
    { v: "rejected", l: "Απορρίφθηκαν" },
  ];

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Eyebrow>Κατάλογος</Eyebrow>
          <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Προϊόντα</h1>
        </div>
        <AddProductButton />
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        {filters.map((f) => (
          <Link
            key={f.v}
            href={`/admin/products?status=${f.v}`}
            className={
              status === f.v
                ? "px-3 py-1.5 rounded-md border border-brand-dark bg-brand-dark text-white"
                : "px-3 py-1.5 rounded-md border border-brand-border bg-brand-surface hover:border-brand-dark/40"
            }
          >
            {f.l}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {((products as any[]) ?? []).map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-brand-dark">{p.name_el}</span>
                  <Badge tone="muted">{p.category}</Badge>
                  <Badge tone="olive">Μονάδα · {p.unit}</Badge>
                </div>
                <div className="text-xs text-brand-muted mt-1">
                  slug · <code className="figures">{p.slug}</code>
                </div>
                {p.attributes_schema && Object.keys(p.attributes_schema).length > 0 && (
                  <div className="text-xs text-brand-muted mt-1">
                    Χαρακτηριστικά: {Object.keys(p.attributes_schema).map(attributeLabel).join(", ")}
                  </div>
                )}
                {p.proposer?.display_name && (
                  <div className="text-xs text-brand-muted mt-1">Πρόταση από: {p.proposer.display_name}</div>
                )}
              </div>
              <div className="flex flex-wrap items-start gap-2">
                {status === "pending" && <ProductActions id={p.id} />}
                {status !== "pending" && (
                  <>
                    <EditProductButton product={p as any} />
                    <DeactivateButton id={p.id} status={p.status} />
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
        {((products as any[]) ?? []).length === 0 && (
          <Card>
            <div className="text-brand-muted text-sm flex items-center gap-2">
              <Icon name="info" /> Καμία εγγραφή σε αυτή την κατηγορία.
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
