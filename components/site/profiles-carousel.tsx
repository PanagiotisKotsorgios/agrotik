import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/card";

export interface CarouselProfile {
  id: string;
  display_name: string;
  role: string;
  region_name: string;
  municipality: string | null;
  bio: string | null;
}

export function ProfilesCarousel({ profiles }: { profiles: CarouselProfile[] }) {
  if (profiles.length === 0) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-14">
      <div className="flex items-end justify-between mb-6">
        <div>
          <div className="eyebrow">Νέα προφίλ</div>
          <h2 className="display mt-2 text-3xl text-brand-dark field-underline">
            Ποιοι μπήκαν πρόσφατα
          </h2>
        </div>
        <Link
          href="/search/buyers"
          className="hidden sm:inline-flex items-center gap-1.5 text-brand-mid hover:text-brand-dark text-sm font-semibold"
        >
          Όλοι <Icon name="arrowRight" />
        </Link>
      </div>

      <div
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4"
        style={{
          scrollbarWidth: "thin",
        }}
      >
        {profiles.map((p) => (
          <Link
            key={p.id}
            href={`/profile/${p.id}`}
            prefetch
            className="shrink-0 w-[280px] snap-start bg-brand-surface border border-brand-border rounded-card p-5 shadow-card hover:border-brand-dark/40 hover:shadow-elev transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0">
                {initials(p.display_name)}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-brand-dark truncate">{p.display_name}</div>
                <Badge tone="brand">{roleLabel(p.role)}</Badge>
              </div>
            </div>
            <div className="mt-3 text-[13px] text-brand-muted inline-flex items-center gap-1.5">
              <Icon name="location" />
              <span className="truncate">
                {p.region_name}
                {p.municipality ? ` · ${p.municipality}` : ""}
              </span>
            </div>
            {p.bio && (
              <p className="mt-3 text-sm text-brand-ink/85 line-clamp-2 leading-snug">{p.bio}</p>
            )}
            <div className="mt-4 text-sm text-brand-mid font-semibold inline-flex items-center gap-1">
              Δες προφίλ <Icon name="arrowRight" className="text-[0.85em]" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";
}
