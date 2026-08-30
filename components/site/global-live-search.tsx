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
  regions?: { name_el: string } | null;
}

/**
 * Home-page live search — queries the whole active-user database as you type.
 * No auth needed (RLS lets anonymous read merchants/factories + public farmers).
 */
export function GlobalLiveSearch() {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const supabaseRef = useRef<ReturnType<typeof createSupabaseBrowser> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createSupabaseBrowser();

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${term}%`;
      const { data } = await supabaseRef
        .current!.from("profiles")
        .select("id, display_name, role, region_code, municipality, bio, regions(name_el)")
        .eq("is_active", true)
        .or(`display_name.ilike.${like},municipality.ilike.${like}`)
        .limit(8);
      setHits((data as any as Hit[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <section className="max-w-3xl mx-auto px-4 -mt-6">
      <div className="relative">
        <label className="relative block">
          <span className="sr-only">Αναζήτηση</span>
          <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted text-lg" />
          <input
            type="search"
            value={q}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            placeholder="Ψάξε με όνομα, επωνυμία ή περιοχή…"
            className="w-full pl-12 pr-11 py-4 rounded-full border-2 border-brand-border bg-brand-surface text-[17px] text-brand-ink placeholder:text-brand-muted/70 focus:outline-none focus:border-brand-mid focus:ring-4 focus:ring-brand-mid/20 shadow-card"
          />
          {q && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setHits([]);
              }}
              aria-label="Καθαρισμός"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-brand-muted hover:bg-brand-border/50 hover:text-brand-dark inline-flex items-center justify-center"
            >
              <Icon name="close" />
            </button>
          )}
        </label>

        {open && q.trim().length >= 2 && (
          <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-brand-border shadow-elev overflow-hidden">
            {loading ? (
              <div className="p-5 text-center text-brand-muted text-sm inline-flex items-center justify-center gap-2 w-full">
                <Icon name="spinner" className="animate-spin" /> Αναζήτηση…
              </div>
            ) : hits.length === 0 ? (
              <div className="p-5 text-center text-brand-muted text-sm">
                Κανένα αποτέλεσμα για «{q.trim()}»
              </div>
            ) : (
              <ul className="divide-y divide-brand-border max-h-[420px] overflow-y-auto">
                {hits.map((h) => (
                  <li key={h.id}>
                    <Link
                      href={`/profile/${h.id}`}
                      className="flex items-center gap-3 p-3.5 hover:bg-brand-bg transition-colors"
                    >
                      <div className="w-11 h-11 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0">
                        {initials(h.display_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-brand-dark truncate">{h.display_name}</span>
                          <Badge tone="brand">{roleLabel(h.role)}</Badge>
                        </div>
                        <div className="text-[13px] text-brand-muted inline-flex items-center gap-1.5">
                          <Icon name="location" />
                          <span className="truncate">
                            {h.regions?.name_el ?? h.region_code}
                            {h.municipality ? ` · ${h.municipality}` : ""}
                          </span>
                        </div>
                      </div>
                      <Icon name="arrowRight" className="text-brand-muted shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? "").join("") || "·";
}
