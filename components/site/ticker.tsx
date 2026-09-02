import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { priceFormat } from "@/lib/utils";

export interface TickerItem {
  profileId: string;
  productName: string;
  price: number;
  unit: string;
  regionName: string;
  updatedAt: string;
}

/**
 * Auto-scrolling marquee of recent price listings.
 * Duplicates the list so translateX(-50%) creates a seamless loop.
 */
export function Ticker({ items }: { items: TickerItem[] }) {
  if (items.length === 0) return null;
  const doubled = [...items, ...items];

  return (
    <section className="border-y border-brand-border bg-brand-surface overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-6">
        <div className="eyebrow shrink-0 flex items-center gap-2 text-brand-dark">
          <Icon name="chart" /> Πρόσφατα
        </div>
        <div
          className="flex-1 overflow-hidden"
          style={{
            maskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          }}
        >
          <div className="flex items-center gap-8 animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] w-max whitespace-nowrap">
            {doubled.map((r, i) => (
              <Link
                key={`${r.profileId}-${i}`}
                href={`/profile/${r.profileId}`}
                aria-hidden={i >= items.length ? true : undefined}
                tabIndex={i >= items.length ? -1 : undefined}
                className="flex items-center gap-3 shrink-0 group text-[15px]"
              >
                <span className="text-brand-muted">{r.productName}</span>
                <span className="figures font-semibold text-brand-dark">
                  {priceFormat(r.price, r.unit)}
                </span>
                <span className="eyebrow text-brand-muted">{r.regionName}</span>
                <Icon
                  name="arrowRight"
                  className="text-brand-muted group-hover:text-brand-dark text-[0.85em]"
                />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
