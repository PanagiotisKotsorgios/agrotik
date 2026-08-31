import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";

export default async function NotificationsPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  const rows = (data as any[]) ?? [];
  const targetIds = Array.from(new Set(rows.map((n) => n.payload?.target_profile_id).filter(Boolean)));
  const productIds = Array.from(new Set(rows.map((n) => n.payload?.product_id).filter(Boolean)));

  const [{ data: targets }, { data: prods }] = await Promise.all([
    targetIds.length
      ? supabase.from("profiles").select("id, display_name").in("id", targetIds)
      : Promise.resolve({ data: [] as any[] }),
    productIds.length
      ? supabase.from("products").select("id, name_el, unit").in("id", productIds)
      : Promise.resolve({ data: [] as any[] }),
  ]);
  const targetMap = new Map((targets as any[]).map((t) => [t.id, t.display_name]));
  const prodMap = new Map((prods as any[]).map((p) => [p.id, p]));

  return (
    <>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <Eyebrow>Ενημερώσεις</Eyebrow>
          <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Ειδοποιήσεις</h1>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="text-brand-muted flex items-center gap-2">
            <Icon name="inbox" /> Δεν υπάρχουν ειδοποιήσεις.
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((n) => {
            if (n.kind === "admin_notice") {
              return (
                <Card key={n.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge tone="warn"><Icon name="shield" /> Ενημέρωση διαχειριστή</Badge>
                        <span className="eyebrow text-brand-muted">{formatRelative(n.created_at)}</span>
                      </div>
                      <h2 className="font-semibold text-brand-dark mt-3">{n.payload?.title}</h2>
                      <p className="text-sm text-brand-ink/85 mt-1 whitespace-pre-wrap break-words">{n.payload?.body}</p>
                    </div>
                  </div>
                </Card>
              );
            }

            const targetName = targetMap.get(n.payload?.target_profile_id) ?? "Έμπορος";
            const product = prodMap.get(n.payload?.product_id);
            const changes = n.payload?.changed_variants ?? [];
            const isNewBetter = n.kind === "new_better_price";
            return (
              <Card key={n.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isNewBetter ? (
                        <Badge tone="ok"><Icon name="trendDown" /> Καλύτερη τιμή</Badge>
                      ) : (
                        <Badge tone="brand"><Icon name="money" /> Αλλαγή τιμής</Badge>
                      )}
                      <span className="font-semibold text-brand-dark">{targetName}</span>
                      <span className="eyebrow text-brand-muted">{formatRelative(n.created_at)}</span>
                    </div>
                    {product && (
                      <div className="text-sm text-brand-muted mt-1">{product.name_el}</div>
                    )}
                    <ul className="mt-2 text-sm space-y-1">
                      {changes.map((c: any, i: number) => (
                        <li key={i} className="text-brand-ink/85 flex items-center gap-2">
                          <span>
                            {Object.entries(c.attributes || {})
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ") || "τιμή"}
                            :{" "}
                          </span>
                          <span className="figures line-through text-brand-muted">
                            {Number(c.old_price).toFixed(2)}€
                          </span>
                          <Icon name="arrowRight" className="text-brand-muted text-[0.7em]" />
                          <span className="figures font-semibold text-brand-earth">
                            {Number(c.new_price).toFixed(2)}€
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link
                    href={`/profile/${n.payload?.target_profile_id}`}
                    className="text-sm text-brand-mid hover:text-brand-dark inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    Δες <Icon name="arrowRight" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
