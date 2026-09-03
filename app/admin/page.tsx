import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Eyebrow } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";

export default async function AdminStats() {
  const svc = createSupabaseService();

  const [profs, prices, prods, prodPend, regionsGroup, reports] = await Promise.all([
    svc.from("profiles").select("role", { count: "exact", head: false }),
    svc.from("price_listings").select("id", { count: "exact", head: true }).eq("is_active", true),
    svc.from("production_listings").select("id", { count: "exact", head: true }).eq("is_active", true),
    svc.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
    svc.from("profiles").select("region_code, regions(name_el)").eq("is_active", true),
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  const roleCounts = new Map<string, number>();
  for (const p of (profs.data as any[]) ?? []) {
    roleCounts.set(p.role, (roleCounts.get(p.role) ?? 0) + 1);
  }
  const regionCounts = new Map<string, number>();
  for (const p of (regionsGroup.data as any[]) ?? []) {
    const name = p.regions?.name_el ?? p.region_code;
    regionCounts.set(name, (regionCounts.get(name) ?? 0) + 1);
  }
  const topRegions = [...regionCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Επισκόπηση</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Στατιστικά</h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          icon="seedling"
          label="Αγρότες"
          value={
            (roleCounts.get("farmer") ?? 0) +
            (roleCounts.get("farmer_fisher") ?? 0) +
            (roleCounts.get("farmer_stockbreeder") ?? 0) +
            (roleCounts.get("farmer_beekeeper") ?? 0)
          }
        />
        <Stat
          icon="fish"
          label="Αλιείς"
          value={(roleCounts.get("fisher") ?? 0) + (roleCounts.get("farmer_fisher") ?? 0)}
        />
        <Stat
          icon="cow"
          label="Κτηνοτρόφοι"
          value={(roleCounts.get("stockbreeder") ?? 0) + (roleCounts.get("farmer_stockbreeder") ?? 0)}
        />
        <Stat
          icon="hive"
          label="Μελισσοκόμοι"
          value={(roleCounts.get("beekeeper") ?? 0) + (roleCounts.get("farmer_beekeeper") ?? 0)}
        />
      </div>
      <div className="grid sm:grid-cols-3 gap-4 mt-4">
        <Stat icon="store" label="Έμποροι" value={roleCounts.get("merchant") ?? 0} />
        <Stat icon="industry" label="Εργοστάσια" value={roleCounts.get("factory") ?? 0} />
        <Stat icon="shield" label="Διαχειριστές" value={roleCounts.get("admin") ?? 0} />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mt-4">
        <Stat icon="tag" label="Ενεργοί τιμοκατάλογοι" value={prices.count ?? 0} />
        <Stat icon="wheat" label="Ενεργές παραγωγές" value={prods.count ?? 0} />
        <Stat icon="box" label="Εκκρεμούν προϊόντα" value={prodPend.count ?? 0} tone="warn" />
        <Stat icon="flag" label="Ανοιχτές αναφορές" value={reports.count ?? 0} tone={reports.count ? "warn" : "default"} />
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex items-center gap-2">
            <Icon name="mapLocation" className="text-brand-dark" />
            <h3 className="font-semibold text-brand-dark">Top 5 νομοί ανά χρήστες</h3>
          </div>
          {topRegions.length === 0 ? (
            <p className="text-sm text-brand-muted mt-3">Δεν υπάρχουν στοιχεία.</p>
          ) : (
            <ul className="mt-4 space-y-1.5 text-sm">
              {topRegions.map(([name, count]) => (
                <li key={name} className="flex justify-between border-b border-brand-border last:border-0 pb-1.5">
                  <span>{name}</span>
                  <span className="figures font-semibold text-brand-dark">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: IconName;
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-brand-muted">
        <Icon name={icon} className={tone === "warn" && value > 0 ? "text-brand-earth" : ""} />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="figures text-3xl font-semibold text-brand-dark mt-2">{value}</div>
    </Card>
  );
}
