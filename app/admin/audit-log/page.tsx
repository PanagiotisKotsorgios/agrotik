export const dynamic = "force-dynamic";

import Link from "next/link";
import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Eyebrow, CardTitle, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";

const PAGE_SIZE = 50;

const ACTION_LABEL: Record<string, { label: string; tone: "ok" | "muted" | "warn" | "brand" }> = {
  "user.suspend": { label: "Αναστολή χρήστη", tone: "warn" },
  "user.reactivate": { label: "Επανενεργοποίηση χρήστη", tone: "ok" },
  "user.role_change": { label: "Αλλαγή ρόλου", tone: "brand" },
  "user.delete": { label: "Οριστική διαγραφή", tone: "warn" },
  "product.approve": { label: "Έγκριση προϊόντος", tone: "ok" },
  "product.reject": { label: "Απόρριψη προϊόντος", tone: "warn" },
  "notice.send": { label: "Αποστολή ειδοποίησης", tone: "brand" },
  "report.resolve": { label: "Επίλυση αναφοράς", tone: "brand" },
};

type ActorInfo = { display_name: string | null } | null;

interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
  actor: ActorInfo;
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pageParam = Array.isArray(params.page) ? params.page[0] : params.page;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const svc = createSupabaseService();
  const { data, count } = await svc
    .from("admin_audit")
    .select("id, actor_id, action, target_type, target_id, detail, created_at, actor:profiles!admin_audit_actor_id_fkey(display_name)", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(from, to);
  const rows = ((data ?? []) as unknown) as AuditRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div>
        <Eyebrow>Admin</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1">Ημερολόγιο ελέγχου</h1>
        <p className="text-brand-muted text-sm mt-1">
          Αναστολές, αλλαγές ρόλων, διαγραφές, εγκρίσεις προϊόντων και επιλύσεις αναφορών.
        </p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <p className="text-brand-muted inline-flex items-center gap-2">
            <Icon name="info" /> Δεν έχουν καταγραφεί ενέργειες ακόμα.
          </p>
        </Card>
      ) : (
        <Card>
          <CardTitle>{total.toLocaleString("el-GR")} εγγραφές</CardTitle>
          <ul className="mt-3 divide-y divide-brand-border">
            {rows.map((row) => {
              const meta = ACTION_LABEL[row.action] ?? { label: row.action, tone: "muted" as const };
              const detailKeys = row.detail ? Object.entries(row.detail) : [];
              return (
                <li key={row.id} className="py-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                      {row.target_id && (
                        <span className="text-xs text-brand-muted font-mono truncate">
                          {row.target_type ?? "target"} · {row.target_id}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-sm text-brand-dark">
                      {row.actor?.display_name ?? "Άγνωστος"}{" "}
                      <span className="text-brand-muted">
                        · {formatRelative(row.created_at)}
                      </span>
                    </div>
                    {detailKeys.length > 0 && (
                      <div className="mt-1 text-xs text-brand-muted">
                        {detailKeys.map(([key, value]) => `${key}: ${String(value)}`).join(" · ")}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          {totalPages > 1 && (
            <div className="mt-4 flex justify-between text-sm">
              {page > 1 ? (
                <Link href={`/admin/audit-log?page=${page - 1}`} className="text-brand-mid hover:underline">
                  ← Προηγούμενη
                </Link>
              ) : <span />}
              <span className="text-brand-muted">
                Σελίδα {page} από {totalPages}
              </span>
              {page < totalPages ? (
                <Link href={`/admin/audit-log?page=${page + 1}`} className="text-brand-mid hover:underline">
                  Επόμενη →
                </Link>
              ) : <span />}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
