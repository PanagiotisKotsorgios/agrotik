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
    if (k.startsWith("attr_") && validAttributeKey(k.slice(5))) attrs[k.slice(5)] = v.slice(0, 120);
    else if (k.startsWith("nmin_") && validAttributeKey(k.slice(5))) {
      const value = numberParam(v);
      if (value !== undefined) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), min: value };
    } else if (k.startsWith("nmax_") && validAttributeKey(k.slice(5))) {
      const value = numberParam(v);
      if (value !== undefined) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), max: value };
    }
  }
  normalizeNumberRanges(numAttrs);

  const buyer_type = g("buyer_type")
    ?.split(",")
    .filter((role): role is "merchant" | "factory" => role === "merchant" || role === "factory");

  const [priceMin, priceMax] = orderedRange(numberParam(g("price_min")), numberParam(g("price_max")));

  return {
    product_id: uuidParam(g("product_id")),
    product_category: textParam(g("product_category"), 80),
    region_code: textParam(g("region_code"), 20),
    municipality: textParam(g("municipality"), 120),
    name: textParam(g("name"), 120),
    attributes: Object.keys(attrs).length ? attrs : undefined,
    number_attrs: Object.keys(numAttrs).length ? numAttrs : undefined,
    price_min: priceMin,
    price_max: priceMax,
    buyer_type: buyer_type && buyer_type.length ? buyer_type : undefined,
    sort: buyerSort(g("sort")),
  };
}

export function parseProducerFilters(params: Record<string, string | string[] | undefined>): ProducerFilters {
  const g = (k: string) => (Array.isArray(params[k]) ? params[k][0] : params[k]) as string | undefined;

  const attrs: Record<string, string> = {};
  const numAttrs: Record<string, { min?: number; max?: number }> = {};
  for (const [k, raw] of Object.entries(params)) {
    const v = Array.isArray(raw) ? raw[0] : raw;
    if (!v) continue;
    if (k.startsWith("attr_") && validAttributeKey(k.slice(5))) attrs[k.slice(5)] = v.slice(0, 120);
    else if (k.startsWith("nmin_") && validAttributeKey(k.slice(5))) {
      const value = numberParam(v);
      if (value !== undefined) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), min: value };
    } else if (k.startsWith("nmax_") && validAttributeKey(k.slice(5))) {
      const value = numberParam(v);
      if (value !== undefined) numAttrs[k.slice(5)] = { ...(numAttrs[k.slice(5)] ?? {}), max: value };
    }
  }
  normalizeNumberRanges(numAttrs);

  const [quantityMin, quantityMax] = orderedRange(numberParam(g("quantity_min")), numberParam(g("quantity_max")));

  return {
    producer_type: g("producer_type") === "farmer" || g("producer_type") === "fisher"
      ? (g("producer_type") as "farmer" | "fisher")
      : undefined,
    product_id: uuidParam(g("product_id")),
    product_category: textParam(g("product_category"), 80),
    region_code: textParam(g("region_code"), 20),
    municipality: textParam(g("municipality"), 120),
    name: textParam(g("name"), 120),
    attributes: Object.keys(attrs).length ? attrs : undefined,
    number_attrs: Object.keys(numAttrs).length ? numAttrs : undefined,
    quantity_min: quantityMin,
    quantity_max: quantityMax,
    date: dateParam(g("date")),
    sort: producerSort(g("sort")),
  };
}

function numberParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function orderedRange(
  minimum: number | undefined,
  maximum: number | undefined,
): [number | undefined, number | undefined] {
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    return [maximum, minimum];
  }
  return [minimum, maximum];
}

function normalizeNumberRanges(ranges: Record<string, { min?: number; max?: number }>) {
  for (const range of Object.values(ranges)) {
    [range.min, range.max] = orderedRange(range.min, range.max);
  }
}

function validAttributeKey(value: string): boolean {
  return /^[a-zA-Z0-9_]{1,50}$/.test(value);
}

function textParam(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function uuidParam(value: string | undefined): string | undefined {
  return value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;
}

function dateParam(value: string | undefined): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value ? value : undefined;
}

function buyerSort(value: string | undefined): BuyerFilters["sort"] {
  return value === "price_asc" || value === "updated" ? value : "price_desc";
}

function producerSort(value: string | undefined): ProducerFilters["sort"] {
  return value === "quantity_desc" || value === "quantity_asc" ? value : "updated";
}

/** Human-readable label of an active filter for chips display. */
export function describeFilter(k: string): string {
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
