import type { PriceVariant } from "@/lib/db/types";

/**
 * Two variants match if their `attributes` are deep-equal after stable
 * key-sorted JSON serialisation.
 */
export function variantFingerprint(v: Pick<PriceVariant, "attributes">): string {
  const keys = Object.keys(v.attributes).sort();
  const sorted: Record<string, string | number> = {};
  for (const k of keys) sorted[k] = v.attributes[k];
  return JSON.stringify(sorted);
}

export interface PriceChange {
  attributes: Record<string, string | number>;
  old_price: number;
  new_price: number;
}

/**
 * Diff two variant arrays. Returns only variants whose PRICE has changed
 * for the same attribute fingerprint. New or removed variants are not
 * treated as changes (per MVP spec).
 */
export function diffVariants(prev: PriceVariant[], next: PriceVariant[]): PriceChange[] {
  const prevMap = new Map<string, PriceVariant>();
  for (const v of prev) prevMap.set(variantFingerprint(v), v);

  const changes: PriceChange[] = [];
  for (const nv of next) {
    const key = variantFingerprint(nv);
    const pv = prevMap.get(key);
    if (pv && Number(pv.price) !== Number(nv.price)) {
      changes.push({
        attributes: nv.attributes,
        old_price: Number(pv.price),
        new_price: Number(nv.price),
      });
    }
  }
  return changes;
}

export function formatVariant(v: PriceVariant, unit: string): string {
  const attrs = Object.entries(v.attributes)
    .map(([k, val]) => `${k}: ${val}`)
    .join(", ");
  return `${attrs} — ${v.price.toFixed(2)} €/${unit}`;
}

/**
 * Return the cheapest (best-for-farmer) variant of a listing, optionally
 * filtered by attribute match.
 */
export function bestVariant(
  variants: PriceVariant[],
  filter?: Record<string, string | number>,
): PriceVariant | null {
  const matching = filter
    ? variants.filter((v) =>
        Object.entries(filter).every(([k, val]) => v.attributes[k] === val),
      )
    : variants;
  if (matching.length === 0) return null;
  return matching.reduce((a, b) => (a.price <= b.price ? a : b));
}
