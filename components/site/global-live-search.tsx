"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/card";
import { roleLabel } from "@/lib/utils";

interface Hit {
  id: string;
  display_name: string;
  role: string;
  region_code: string;
  municipality: string | null;
  bio: string | null;
  avatar_url: string | null;
  regions?: { name_el: string } | null;
}

const ROLE_FILTERS = [
  { key: "all", label: "Όλοι", role: null as string | null },
  { key: "farmer", label: "Αγρότες", role: "farmer" },
  { key: "merchant", label: "Έμποροι", role: "merchant" },
  { key: "factory", label: "Εργοστάσια", role: "factory" },
];

/**
 * Home-page public search:
 *   ─ text search + role filter chips
 *   ─ results shown inline as a card grid (not a dropdown)
 *   ─ when idle (no query, no filter) shows a random pick of public
 *     profiles so the page never looks empty
 */
export function GlobalLiveSearch() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [hits, setHits] = useState<Hit[]>([]);
  const [suggestions, setSuggestions] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowser> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createSupabaseBrowser();

  // Suggested random profiles once on mount
  useEffect(() => {
    (async () => {
      const { data } = await supabaseRef.current!
        .from("profiles")
        .select("id, display_name, role, region_code, municipality, bio, avatar_url, regions(name_el)")
        .eq("is_active", true)
        .eq("is_public", true)
        .neq("role", "admin")
        .in("role", ["farmer", "merchant", "factory"])
        .is("deleted_at", null)
        .limit(24);
      const arr = ((data as any as Hit[]) ?? [])
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 6);
      setSuggestions(arr);
    })();
  }, []);

  // Search / filter
  const isFiltered = q.trim().length >= 2 || roleFilter !== "all";
  useEffect(() => {
    if (!isFiltered) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      let query = supabaseRef
        .current!.from("profiles")
        .select("id, display_name, role, region_code, municipality, bio, avatar_url, regions(name_el)")
        .eq("is_active", true)
        .eq("is_public", true)
        .neq("role", "admin")
        .in("role", ["farmer", "merchant", "factory"])
        .is("deleted_at", null);

      const activeFilter = ROLE_FILTERS.find((f) => f.key === roleFilter);
      if (activeFilter?.role) {
        query = query.eq("role", activeFilter.role);
      }

      const term = q.trim();
      if (term.length >= 2) {
        const like = `%${term}%`;
        query = query.or(
          `display_name.ilike.${like},municipality.ilike.${like},bio.ilike.${like}`,
        );
      }

      const { data } = await query.limit(18);
      setHits((data as any as Hit[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, roleFilter, isFiltered]);

  const showing = isFiltered ? hits : suggestions;

  return (
    <section className="max-w-5xl mx-auto px-4 -mt-6">
      {/* Search input */}
      <label className="relative block">
        <span className="sr-only">Αναζήτηση</span>
        <Icon
          name="search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted text-lg"
        />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ψάξε με όνομα, επωνυμία ή περιοχή…"
          className="w-full pl-12 pr-11 py-4 rounded-full border-2 border-brand-dark/30 bg-white text-[17px] text-brand-ink placeholder:text-brand-muted/70 focus:outline-none focus:border-brand-mid focus:ring-4 focus:ring-brand-mid/20 shadow-card"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            aria-label="Καθαρισμός"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-brand-muted hover:bg-brand-border/50 hover:text-brand-dark inline-flex items-center justify-center"
          >
            <Icon name="close" />
          </button>
        )}
      </label>

      {/* Role filter chips */}
      <div className="mt-4 flex flex-wrap gap-2 justify-center">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setRoleFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              roleFilter === f.key
                ? "bg-brand-dark text-white"
                : "bg-white border border-brand-border text-brand-ink hover:border-brand-dark/40"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Results grid */}
      <div className="mt-6">
        <div className="eyebrow mb-3">
          {loading
            ? "Αναζήτηση…"
            : isFiltered
              ? `${showing.length} ${showing.length === 1 ? "αποτέλεσμα" : "αποτελέσματα"}`
              : "Προτεινόμενα προφίλ"}
        </div>

        {loading ? (
          <div className="text-center text-brand-muted text-sm inline-flex items-center gap-2 py-8 justify-center w-full">
            <Icon name="spinner" className="animate-spin" /> Ψάχνουμε…
          </div>
        ) : showing.length === 0 ? (
          <div className="text-center text-brand-muted py-8 border border-dashed border-brand-border rounded-2xl bg-white">
            Κανένα αποτέλεσμα{q.trim() ? ` για «${q.trim()}»` : ""}. Δοκίμασε άλλο φίλτρο.
          </div>
        ) : (
          <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {showing.map((h) => (
              <li key={h.id}>
                <Link
                  href={`/profile/${h.id}`}
                  className="flex flex-col p-4 bg-white rounded-xl border border-brand-border hover:border-brand-dark/40 hover:shadow-card transition-all h-full"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0 overflow-hidden">
                      {h.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={h.avatar_url}
                          alt={h.display_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials(h.display_name)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-brand-dark line-clamp-1">
                          {h.display_name}
                        </span>
                        <Badge tone="brand">{roleLabel(h.role)}</Badge>
                      </div>
                      <div className="text-[13px] text-brand-muted flex items-start gap-1.5 mt-1 min-w-0">
                        <Icon name="location" className="shrink-0 mt-0.5" />
                        <span className="line-clamp-2 leading-snug break-words min-w-0">
                          {h.regions?.name_el ?? h.region_code}
                          {h.municipality ? ` · ${h.municipality}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                  {h.bio && (
                    <p className="mt-3 text-sm text-brand-ink/85 line-clamp-2 leading-snug">
                      {h.bio}
                    </p>
                  )}
                  <div className="mt-auto pt-3 text-sm text-brand-mid font-semibold inline-flex items-center gap-1">
                    Δες προφίλ <Icon name="arrowRight" className="text-[0.85em]" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() ?? "")
      .join("") || "·"
  );
}
