"use client";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Icon } from "@/components/ui/icon";
import { saveSearch } from "@/lib/actions/saved-searches";

export function SaveSearchButton({ scope }: { scope: "producers" | "buyers" }) {
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button type="button" variant="outline" size="sm" icon="heart" onClick={() => { setSaved(false); setError(null); setOpen(true); }}>
        Αποθήκευση αναζήτησης
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Αποθήκευση αναζήτησης"
          onClick={() => setOpen(false)}
        >
          <form
            className="w-full max-w-sm bg-white rounded-2xl border border-brand-border p-5"
            onClick={(event) => event.stopPropagation()}
            onSubmit={(event) => {
              event.preventDefault();
              const fd = new FormData(event.currentTarget);
              const label = String(fd.get("label") ?? "").trim();
              const alerts = fd.get("alerts") === "on";
              const filters: Record<string, string> = {};
              params.forEach((value, key) => {
                if (key === "page") return;
                if (value) filters[key] = value;
              });
              start(async () => {
                setError(null);
                const res = await saveSearch({ scope, label, filters, alerts_enabled: alerts });
                if (!res.ok) return setError(res.error);
                setSaved(true);
              });
            }}
          >
            <h2 className="display text-lg text-brand-dark">Αποθήκευση αναζήτησης</h2>
            {saved ? (
              <>
                <p className="mt-3 text-sm text-emerald-800 inline-flex items-center gap-2">
                  <Icon name="ok" /> Αποθηκεύτηκε. Δες τη λίστα σου στο dashboard.
                </p>
                <div className="mt-3 flex justify-end">
                  <Button type="button" onClick={() => setOpen(false)}>Κλείσιμο</Button>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3">
                  <Label htmlFor="ss-label">Όνομα αναζήτησης</Label>
                  <Input id="ss-label" name="label" required maxLength={120} placeholder="π.χ. Ελιές Καλαμάτας &lt; 3€" />
                </div>
                <label className="mt-3 flex items-start gap-2 text-sm">
                  <input type="checkbox" name="alerts" className="mt-0.5" />
                  <span>Στέλνε μου email όταν υπάρχουν νέες αντιστοιχίες</span>
                </label>
                {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>Άκυρο</Button>
                  <Button type="submit" icon={pending ? "spinner" : "check"} disabled={pending}>Αποθήκευση</Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </>
  );
}
