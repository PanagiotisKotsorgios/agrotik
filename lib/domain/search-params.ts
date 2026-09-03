import type { BuyerFilters, ProducerFilters } from "@/lib/db/queries";
import { attributeLabel } from "@/lib/utils";

/** Parse Next.js searchParams into structured BuyerFilters. */
export function parseBuyerFilters(params: Record<string, string | string[] | undefined>): BuyerFilters {
  const g = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]) as string | undefined;

  const attrs: Record<string, string> = {};
  const numAttrs: Record<string, { min?: number; max?: number }> = {};

  for (const [k, raw] of Object.entries(params)) {
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (!v) continue;
    if (k.startsWith("attr_")) attrs[k.slice(5)] = v;
    else if (k.startsWith("nmin_")) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), min: Number(v) };
    else if (k.startsWith("nmax_")) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), max: Number(v) };
  }

  const buyer_type = g("buyer_type")
    ?.split(",")
    .filter(
      (role): role is "merchant" | "factory" | "agri_supplier" =>
        role === "merchant" || role === "factory" || role === "agri_supplier",
    );

  return {
    product_id: g("product_id") || undefined,
    product_category: g("product_category") || undefined,
    region_code: g("region_code") || undefined,
    municipality: g("municipality") || undefined,
    name: g("name") || undefined,
    attributes: Object.keys(attrs).length ? attrs : undefined,
    number_attrs: Object.keys(numAttrs).length ? numAttrs : undefined,
    price_min: g("price_min") ? Number(g("price_min")) : undefined,
    price_max: g("price_max") ? Number(g("price_max")) : undefined,
    buyer_type: buyer_type && buyer_type.length ? buyer_type : undefined,
    sort: (g("sort") as any) || "price_asc",
  };
}

export function parseProducerFilters(params: Record<string, string | string[] | undefined>): ProducerFilters {
  const g = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]) as string | undefined;

  const attrs: Record<string, string> = {};
  const numAttrs: Record<string, { min?: number; max?: number }> = {};
  for (const [k, raw] of Object.entries(params)) {
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (!v) continue;
    if (k.startsWith("attr_")) attrs[k.slice(5)] = v;
    else if (k.startsWith("nmin_")) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), min: Number(v) };
    else if (k.startsWith("nmax_")) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), max: Number(v) };
  }

  const producerTypeRaw = g("producer_type");
  const producerType =
    producerTypeRaw === "farmer" ||
    producerTypeRaw === "fisher" ||
    producerTypeRaw === "stockbreeder" ||
    producerTypeRaw === "beekeeper"
      ? (producerTypeRaw as "farmer" | "fisher" | "stockbreeder" | "beekeeper")
      : undefined;

  return {
    producer_type: producerType,
    product_id: g("product_id") || undefined,
    product_category: g("product_category") || undefined,
    region_code: g("region_code") || undefined,
    municipality: g("municipality") || undefined,
    name: g("name") || undefined,
    attributes: Object.keys(attrs).length ? attrs : undefined,
    number_attrs: Object.keys(numAttrs).length ? numAttrs : undefined,
    quantity_min: g("quantity_min") ? Number(g("quantity_min")) : undefined,
    quantity_max: g("quantity_max") ? Number(g("quantity_max")) : undefined,
    date: g("date") || undefined,
    sort: (g("sort") as any) || "updated",
  };
}

/** Human-readable label of an active filter for chips display. */
export function describeFilter(k: string, v: string): string {
  const labels: Record<string, string> = {
    product_category: "Κατηγορία",
    region_code: "Νομός",
    municipality: "Δήμος",
    name: "Επωνυμία",
    price_min: "Τιμή από",
    price_max: "Τιμή έως",
    quantity_min: "Ποσότητα από",
    quantity_max: "Ποσότητα έως",
    date: "Διαθέσιμο",
    buyer_type: "Τύπος",
    producer_type: "Τύπος παραγωγού",
    sort: "Ταξινόμηση",
  };
  if (k.startsWith("attr_")) return attributeLabel(k.slice(5));
  if (k.startsWith("nmin_")) return `${attributeLabel(k.slice(5))} από`;
  if (k.startsWith("nmax_")) return `${attributeLabel(k.slice(5))} έως`;
  return labels[k] ?? k;
}
