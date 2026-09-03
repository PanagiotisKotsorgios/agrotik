import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { getActiveProducts } from "@/lib/db/queries";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { PurchasesManager } from "./manager";
import { formatQuantity, formatRelative, priceFormat } from "@/lib/utils";

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "merchant" && me?.role !== "factory") redirect("/dashboard");

  const params = await searchParams;
  const season = params.season || currentSeason();

  const [{ data: purchases }, { data: producers }, products] = await Promise.all([
    supabase
      .from("purchases")
      .select(
        "*, profiles!purchases_farmer_id_fkey(id, display_name, municipality, regions(name_el)), products(name_el, unit)",
      )
      .eq("buyer_id", user.id)
      .order("purchased_at", { ascending: false })
      .limit(300),
    supabase
      .from("profiles")
      .select("id, display_name, municipality, region_code, regions(name_el)")
      .in("role", [
        "farmer",
        "fisher",
        "farmer_fisher",
        "stockbreeder",
        "beekeeper",
        "farmer_stockbreeder",
        "farmer_beekeeper",
      ])
      .eq("is_active", true)
      .eq("is_public", true)
      .order("display_name")
      .limit(500),
    getActiveProducts(),
  ]);

  const rows = (purchases as any[]) ?? [];
  const seasonRows = rows.filter((r) => r.season === season);

  // Aggregations for the current season
  type Line = { productName: string; qty: number; unit: string; totalValue: number };
  const byFarmer = new Map<string, { name: string; region: string; items: Line[]; totalValue: number }>();
  const byProduct = new Map<string, Line>();
  let seasonTotal = 0;
  for (const r of seasonRows) {
    const pname = r.profiles?.display_name ?? "—";
    const region = [r.profiles?.regions?.name_el, r.profiles?.municipality].filter(Boolean).join(" · ");
    const productName = r.products?.name_el ?? "";
    const qty = Number(r.quantity) || 0;
    const value = qty * (Number(r.price_per_unit) || 0);
    seasonTotal += value;

    // per farmer
    const f = byFarmer.get(r.farmer_id) ?? { name: pname, region, items: [] as Line[], totalValue: 0 };
    const existingItem = f.items.find((x) => x.productName === productName && x.unit === (r.unit || r.products?.unit));
    if (existingItem) {
      existingItem.qty += qty;
      existingItem.totalValue += value;
    } else {
      f.items.push({ productName, qty, unit: r.unit || r.products?.unit || "", totalValue: value });
    }
    f.totalValue += value;
    byFarmer.set(r.farmer_id, f);

    // per product
    const key = `${productName}::${r.unit || r.products?.unit || ""}`;
    const p = byProduct.get(key) ?? { productName, qty: 0, unit: r.unit || r.products?.unit || "", totalValue: 0 };
    p.qty += qty;
    p.totalValue += value;
    byProduct.set(key, p);
  }
  const seasons = Array.from(new Set(rows.map((r) => r.season))).sort().reverse();
  if (!seasons.includes(season)) seasons.unshift(season);

  return (
    <>
      <div className="mb-8">
        <Eyebrow>Δίκτυο & δεδομένα</Eyebrow>
        <h1 className="display text-3xl sm:text-4xl text-brand-dark mt-1 field-underline">Αγορές & σεζόν</h1>
        <p className="mt-3 text-brand-muted text-[16px]">
          Καταγράφεις τι αγόρασες από κάθε παραγωγό ή αλιέα. Ο πίνακας ενημερώνεται αυτόματα ανά σεζόν και εμφανίζει σύνολα.
        </p>
      </div>

      {/* Season selector */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {seasons.map((s) => (
          <Link
            key={s}
            href={s === currentSeason() ? "/dashboard/purchases" : `/dashboard/purchases?season=${encodeURIComponent(s)}`}
            className={
              season === s
                ? "px-4 py-2 rounded-md border-2 border-brand-dark bg-brand-dark text-white text-sm font-semibold"
                : "px-4 py-2 rounded-md border border-brand-border bg-white text-brand-dark text-sm font-semibold hover:border-brand-dark/40"
            }
          >
            Σεζόν {s}
          </Link>
        ))}
      </div>

      {/* Season summary */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <SummaryStat icon="listCheck" label="Καταχωρήσεις" value={String(seasonRows.length)} />
        <SummaryStat icon="users" label="Παραγωγοί & αλιείς" value={String(byFarmer.size)} />
        <SummaryStat
          icon="money"
          label={`Συνολική αξία ${season}`}
          value={seasonTotal > 0 ? `${seasonTotal.toFixed(2)} €` : "—"}
        />
      </div>

      {/* Per-farmer breakdown */}
      {byFarmer.size > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="users" className="text-brand-dark" />
            <h2 className="display text-xl text-brand-dark">Ανά παραγωγό / αλιέα — σεζόν {season}</h2>
          </div>
          <div className="space-y-4">
            {[...byFarmer.entries()]
              .sort((a, b) => b[1].totalValue - a[1].totalValue)
              .map(([id, f]) => (
                <div key={id} className="border-t border-brand-border pt-3 first:border-t-0 first:pt-0">
                  <div className="flex items-baseline justify-between gap-4 flex-wrap">
                    <Link href={`/profile/${id}`} className="font-semibold text-brand-dark hover:underline text-[16px]">
                      {f.name}
                    </Link>
                    <span className="figures font-semibold text-brand-earth">
                      {f.totalValue > 0 ? `${f.totalValue.toFixed(2)} €` : "—"}
                    </span>
                  </div>
                  <div className="text-xs text-brand-muted">{f.region}</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {f.items.map((it, i) => (
                      <li key={i} className="flex justify-between text-brand-ink/85">
                        <span>{it.productName}</span>
                        <span className="figures">
                          {formatQuantity(it.qty, it.unit)}
                          {it.totalValue > 0 && (
                            <span className="text-brand-muted ml-2">· {it.totalValue.toFixed(2)} €</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Per-product totals */}
      {byProduct.size > 0 && (
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Icon name="box" className="text-brand-dark" />
            <h2 className="display text-xl text-brand-dark">Ανά προϊόν</h2>
          </div>
          <ul className="space-y-2 text-sm">
            {[...byProduct.values()]
              .sort((a, b) => b.qty - a.qty)
              .map((p, i) => (
                <li key={i} className="flex justify-between border-b border-brand-border last:border-0 pb-2 last:pb-0">
                  <span className="font-medium text-brand-ink">{p.productName}</span>
                  <span className="figures">
                    {formatQuantity(p.qty, p.unit)}
                    {p.totalValue > 0 && <span className="text-brand-muted ml-2">· {p.totalValue.toFixed(2)} €</span>}
                  </span>
                </li>
              ))}
          </ul>
        </Card>
      )}

      {/* Add + list */}
      <PurchasesManager
        initialPurchases={rows}
        producers={(producers as any[]) ?? []}
        products={products}
        defaultSeason={season}
      />
    </>
  );
}

function SummaryStat({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-brand-muted">
        <Icon name={icon} />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="figures text-2xl font-semibold text-brand-dark mt-2">{value}</div>
    </Card>
  );
}

function currentSeason(): string {
  const now = new Date();
  const y = now.getFullYear();
  // Πριν τον Αύγουστο, θεωρούμε ότι είμαστε στην προηγούμενη σεζόν
  return now.getMonth() >= 7 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
}
