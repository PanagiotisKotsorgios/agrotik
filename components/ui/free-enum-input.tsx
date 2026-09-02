"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Enum-style attribute input that also accepts free text.
 *
 * The dropdown (native <datalist>) suggests curated values from the
 * product schema, but the user can type anything — a raw number, a
 * range like "150-170", a caliber like "160+", or several values
 * separated by commas ("120-140, 160-180"). No client-side validation
 * so producers who use an unusual grade don't get blocked.
 */
export function FreeEnumInput({
  id,
  value,
  suggestions,
  placeholder,
  onChange,
  className,
}: {
  id: string;
  value: string;
  suggestions: string[];
  placeholder?: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const listId = `${id}-suggestions`;
  return (
    <div className="space-y-1.5">
      <input
        id={id}
        list={listId}
        type="text"
        value={value}
        placeholder={placeholder ?? "Διάλεξε πρόταση ή γράψε ελεύθερα…"}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full px-3.5 py-2.5 rounded-lg border-2 border-brand-dark/40 bg-white text-brand-ink text-[16px] placeholder:text-brand-muted/70 shadow-sm",
          "focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid",
          className,
        )}
      />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] text-brand-muted uppercase tracking-wider font-semibold">
            Γρήγορα:
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                // If the current value is empty, replace. Otherwise append with comma.
                const cur = value.trim();
                if (!cur) {
                  onChange(s);
                } else if (cur.split(/\s*,\s*/).includes(s)) {
                  return; // already present
                } else {
                  onChange(`${cur}, ${s}`);
                }
              }}
              className="px-2.5 py-1 rounded-full text-xs bg-brand-bg border border-brand-border text-brand-ink hover:border-brand-dark/40 hover:bg-brand-dark hover:text-white transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <p className="text-[11px] text-brand-muted">
        Χώρισε πολλαπλές τιμές με κόμμα (πχ <span className="font-mono">120-140, 160+</span>).
      </p>
    </div>
  );
}
