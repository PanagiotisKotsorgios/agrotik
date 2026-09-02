import Link from "next/link";
import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";

export default async function AdminStats() {
  const svc = createSupabaseService();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [profs, prices, prods, prodPend, regionsGroup, reports, newUsers30, newPrices7, newProds7, audit] = await Promise.all([
    svc.from("profiles").select("role", { count: "exact", head: false }),
    svc.from("price_listings").select("id", { count: "exact", head: true }).eq("is_active", true),
    svc.from("production_listings").select("id", { count: "exact", head: true }).eq("is_active", true),
    svc.from("products").select("id", { count: "exact", head: true }).eq("status", "pending"),
    svc.from("profiles").select("region_code, regions(name_el)").eq("is_active", true),
    svc.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    svc.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", thirtyDaysAgo),
    svc.from("price_listings").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    svc.from("production_listings").select("id", { count: "exact", head: true }).gte("created_at", sevenDaysAgo),
    svc
      .from("admin_audit")
      .select("id, action, target_type, target_id, created_at, actor:profiles!admin_audit_actor_id_fkey(display_name)")
      .order("created_at", { ascending: false })
      .limit(10),
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

      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Stat icon="seedling" label="Αγρότες" value={(roleCounts.get("farmer") ?? 0) + (roleCounts.get("farmer_fisher") ?? 0)} />
        <Stat icon="fish" label="Αλιείς" value={(roleCounts.get("fisher") ?? 0) + (roleCounts.get("farmer_fisher") ?? 0)} />
        <Stat icon="store" label="Έμποροι" value={roleCounts.get("merchant") ?? 0} />
        <Stat icon="industry" label="Εργοστάσια" value={roleCounts.get("factory") ?? 0} />
        <Stat icon="shield" label="Διαχειριστές" value={roleCounts.get("admin") ?? 0} />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mt-4">
        <ClickableStat href="/admin/users?sort=recent" icon="users" label="Νέοι χρήστες (30μ)" value={newUsers30.count ?? 0} />
        <Stat icon="tag" label="Ενεργοί τιμοκατάλογοι" value={prices.count ?? 0} />
        <Stat icon="wheat" label="Ενεργές παραγωγές" value={prods.count ?? 0} />
        <ClickableStat href="/admin/products?status=pending" icon="box" label="Εκκρεμούν προϊόντα" value={prodPend.count ?? 0} tone="warn" />
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mt-4">
        <Stat icon="tag" label="Νέοι τιμοκατάλογοι (7μ)" value={newPrices7.count ?? 0} />
        <Stat icon="wheat" label="Νέες παραγωγές (7μ)" value={newProds7.count ?? 0} />
        <ClickableStat href="/admin/reports?status=open" icon="flag" label="Ανοιχτές αναφορές" value={reports.count ?? 0} tone={reports.count ? "warn" : "default"} />
        <ClickableStat href="/admin/audit-log" icon="listCheck" label="Πρόσφατες ενέργειες" value={audit.data?.length ?? 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Icon name="listCheck" className="text-brand-dark" />
              <h3 className="font-semibold text-brand-dark">Πρόσφατη δραστηριότητα admin</h3>
            </div>
            <Link href="/admin/audit-log" className="text-xs text-brand-mid hover:underline">
              Δες όλα →
            </Link>
          </div>
          {(!audit.data || audit.data.length === 0) ? (
            <p className="text-sm text-brand-muted mt-3">Δεν έχουν καταγραφεί ενέργειες ακόμα.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {(audit.data as any[]).map((row) => (
                <li key={row.id} className="flex items-start justify-between gap-2 border-b border-brand-border last:border-0 pb-2">
                  <div className="min-w-0">
                    <div className="text-brand-dark truncate">{row.action}</div>
                    <div className="text-xs text-brand-muted truncate">
                      {row.actor?.display_name ?? "άγνωστος"} · {formatRelative(row.created_at)}
                    </div>
                  </div>
                  {row.target_type && (
                    <Badge tone="muted">{row.target_type}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>

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

function ClickableStat({ href, ...props }: React.ComponentProps<typeof Stat> & { href: string }) {
  return (
    <Link href={href} className="block hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-mid rounded-2xl">
      <Stat {...props} />
    </Link>
  );
}
