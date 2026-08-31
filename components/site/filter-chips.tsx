import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { describeFilter } from "@/lib/domain/search-params";

/**
 * Active-filter chips. Each chip removes its param from the URL when clicked.
 * `regionLabels` and `productLabels` map codes/ids to human strings.
 */
export function FilterChips({
  basePath,
  params,
  regionLabels,
  productLabels,
  categoryLabels,
}: {
  basePath: string;
  params: Record<string, string | string[] | undefined>;
  regionLabels?: Map<string, string>;
  productLabels?: Map<string, string>;
  categoryLabels?: Map<string, string>;
}) {
  const active = Object.entries(params).filter(([k, v]) => {
    if (!v) return false;
    if (Array.isArray(v) && v.length === 0) return false;
    if (k === "page") return false;
    if (k === "sort") return v !== "price_asc" && v !== "updated"; // default value
    return true;
  });

  if (active.length === 0) return null;

  const buildLink = (removeKey: string) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (k === removeKey || k === "page") continue;
      const val = Array.isArray(v) ? v[0] : v;
      if (val) q.set(k, val);
    }
    const qs = q.toString();
    return qs ? `${basePath}?${qs}` : basePath;
  };

  const humanValue = (k: string, v: string) => {
    if (k === "region_code") return regionLabels?.get(v) ?? v;
    if (k === "product_id") return productLabels?.get(v) ?? v;
    if (k === "product_category") return categoryLabels?.get(v) ?? v;
    if (k === "sort") {
      const map: Record<string, string> = {
        price_asc: "Τιμή αύξουσα",
        price_desc: "Τιμή φθίνουσα",
        updated: "Πιο πρόσφατα",
        quantity_desc: "Ποσότητα φθίνουσα",
        quantity_asc: "Ποσότητα αύξουσα",
      };
      return map[v] ?? v;
    }
    return v;
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-sm text-brand-muted mr-1">Ενεργά φίλτρα:</span>
      {active.map(([k, v]) => {
        const raw = Array.isArray(v) ? v[0] : (v as string);
        const label = describeFilter(k, raw);
        return (
          <Link
            key={k}
            href={buildLink(k)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-dark/8 text-brand-dark text-sm border border-brand-dark/15 hover:bg-brand-dark/12"
          >
            <span className="font-medium">{label}:</span>
            <span>{humanValue(k, raw)}</span>
            <Icon name="close" className="opacity-70 text-[0.85em]" />
          </Link>
        );
      })}
      <Link
        href={basePath}
        className="text-sm text-brand-muted hover:text-brand-dark underline underline-offset-2"
      >
        Καθαρισμός όλων
      </Link>
    </div>
  );
}
