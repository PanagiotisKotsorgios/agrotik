import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/utils";
import { UserActions } from "./user-actions";
import Link from "next/link";

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const svc = createSupabaseService();

  let query = svc
    .from("profiles")
    .select("*, regions(name_el)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (params.role) query = query.eq("role", params.role);

  const { data: users } = await query;

  const filters = [
    { v: "", l: "Όλοι" },
    { v: "farmer", l: "Αγρότες" },
    { v: "merchant", l: "Έμποροι" },
    { v: "factory", l: "Εργοστάσια" },
    { v: "admin", l: "Admins" },
  ];

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Λογαριασμοί</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Χρήστες</h1>
      </div>

      <div className="mb-4 flex gap-2 text-sm">
        {filters.map((f) => (
          <Link
            key={f.v}
            href={f.v ? `/admin/users?role=${f.v}` : "/admin/users"}
            className={
              (params.role ?? "") === f.v
                ? "px-3 py-1.5 rounded-md border border-brand-dark bg-brand-dark text-white"
                : "px-3 py-1.5 rounded-md border border-brand-border bg-brand-surface hover:border-brand-dark/40"
            }
          >
            {f.l}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {((users as any[]) ?? []).map((u) => (
          <Card key={u.id} className="p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/profile/${u.id}`} className="font-semibold text-brand-dark hover:underline truncate">
                    {u.display_name}
                  </Link>
                  <Badge tone="brand">{roleLabel(u.role)}</Badge>
                  {!u.is_active && <Badge tone="danger">Suspended</Badge>}
                </div>
                <div className="text-xs text-brand-muted mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1"><Icon name="location" /> {u.regions?.name_el ?? u.region_code}</span>
                  <span className="text-brand-border">·</span>
                  <span className="inline-flex items-center gap-1"><Icon name="phone" /> {u.phone}</span>
                </div>
              </div>
              <UserActions userId={u.id} isActive={u.is_active} role={u.role} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
