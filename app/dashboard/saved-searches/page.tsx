export const dynamic = "force-dynamic";

import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";
import { SavedSearchActions } from "./actions";

interface SavedSearch {
  id: string;
  scope: "producers" | "buyers";
  label: string;
  filters: Record<string, string | number | string[]>;
  alerts_enabled: boolean;
  last_notified_at: string | null;
  created_at: string;
}

function toQueryString(filters: SavedSearch["filters"]): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (Array.isArray(value)) params.set(key, value.join(","));
    else if (value !== undefined && value !== null && String(value).length > 0) params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default async function SavedSearchesPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("saved_searches")
    .select("id, scope, label, filters, alerts_enabled, last_notified_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  const rows = ((data ?? []) as unknown) as SavedSearch[];

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Αναζητήσεις</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1">Αποθηκευμένες αναζητήσεις</h1>
        <p className="text-brand-muted text-sm mt-1">
          Αποθήκευσε φίλτρα που χρησιμοποιείς συχνά. Αν ενεργοποιήσεις ειδοποιήσεις, θα λαμβάνεις email όταν εμφανίζονται νέες αντιστοιχίες.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-brand-muted inline-flex items-center gap-2">
            <Icon name="info" /> Δεν έχεις αποθηκεύσει αναζητήσεις ακόμα. Χρησιμοποίησε το κουμπί «Αποθήκευση αναζήτησης» στις σελίδες{" "}
            <Link href="/search/producers" className="text-brand-mid hover:underline">Παραγωγοί</Link> ή{" "}
            <Link href="/search/buyers" className="text-brand-mid hover:underline">Αγοραστές</Link>.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const href = `/search/${row.scope}${toQueryString(row.filters)}`;
            return (
              <Card key={row.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="brand">{row.scope === "producers" ? "Παραγωγοί" : "Αγοραστές"}</Badge>
                      {row.alerts_enabled && (
                        <Badge tone="ok"><Icon name="bell" /> Ειδοποιήσεις ενεργές</Badge>
                      )}
                    </div>
                    <Link href={href} className="mt-2 block font-semibold text-brand-dark hover:underline truncate">
                      {row.label}
                    </Link>
                    <div className="mt-1 text-xs text-brand-muted">
                      Αποθηκεύτηκε {formatRelative(row.created_at)}
                    </div>
                  </div>
                  <SavedSearchActions id={row.id} alertsEnabled={row.alerts_enabled} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
