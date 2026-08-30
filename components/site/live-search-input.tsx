"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Icon } from "@/components/ui/icon";

/**
 * Debounced live search input που ενημερώνει το URL param `name` και
 * επαναφορτώνει τη server component χωρίς full-page reload.
 */
export function LiveSearchInput({ placeholder = "Αναζήτηση με όνομα ή επωνυμία…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get("name") ?? "");
  const [, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => {
      const q = new URLSearchParams(params.toString());
      const trimmed = value.trim();
      if (trimmed) q.set("name", trimmed);
      else q.delete("name");
      start(() => router.replace(`${pathname}${q.toString() ? "?" + q : ""}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <label className="relative block mb-4">
      <span className="sr-only">{placeholder}</span>
      <Icon name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-11 pr-11 py-3.5 rounded-full border-2 border-brand-border bg-brand-surface text-[16px] text-brand-ink placeholder:text-brand-muted/70 focus:outline-none focus:border-brand-mid focus:ring-2 focus:ring-brand-mid/25"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Καθαρισμός"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-brand-muted hover:bg-brand-border/50 hover:text-brand-dark inline-flex items-center justify-center"
        >
          <Icon name="close" />
        </button>
      )}
    </label>
  );
}
