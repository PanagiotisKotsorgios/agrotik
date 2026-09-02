import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";
import { ReportRowActions } from "./row-actions";
import Link from "next/link";

const STATUS_TONE: Record<string, "muted" | "warn" | "ok" | "danger"> = {
  open: "warn",
  reviewing: "muted",
  resolved: "ok",
  dismissed: "danger",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Ανοιχτό",
  reviewing: "Σε εξέταση",
  resolved: "Επιλύθηκε",
  dismissed: "Απορρίφθηκε",
};

const TARGET_LABEL: Record<string, string> = {
  profile: "Προφίλ",
  price_listing: "Τιμοκατάλογος",
  production_listing: "Παραγωγή",
  message: "Μήνυμα",
};

const CATEGORY_LABEL: Record<string, string> = {
  misleading: "Παραπλανητικό",
  spam: "Spam",
  abuse: "Παρενόχληση",
  privacy: "Προσωπικά δεδομένα",
  unsafe: "Επικίνδυνο / παράνομο",
  other: "Άλλο",
};

export default async function AdminReports({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const p = await searchParams;
  const status = (p.status as any) || "open";
  const svc = createSupabaseService();

  const { data: reports } = await svc
    .from("reports")
    .select("*, reporter:profiles!reports_reporter_id_fkey(id, display_name)")
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Moderation</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Αναφορές</h1>
      </div>

      <div className="flex gap-2 mb-4 text-sm">
        {Object.keys(STATUS_LABEL).map((k) => (
          <Link
            key={k}
            href={`/admin/reports?status=${k}`}
            className={
              status === k
                ? "px-3 py-1.5 rounded-md border border-brand-dark bg-brand-dark text-white"
                : "px-3 py-1.5 rounded-md border border-brand-border bg-brand-surface hover:border-brand-dark/40"
            }
          >
            {STATUS_LABEL[k]}
          </Link>
        ))}
      </div>

      <div className="space-y-2">
        {((reports as any[]) ?? []).map((r) => (
          <Card key={r.id}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge tone={STATUS_TONE[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                  <Badge tone="muted">{TARGET_LABEL[r.target_type]}</Badge>
                  <Badge tone="muted">{CATEGORY_LABEL[r.category] ?? CATEGORY_LABEL.other}</Badge>
                  <span className="eyebrow text-brand-muted">{formatRelative(r.created_at)}</span>
                </div>
                <div className="mt-2 text-sm text-brand-ink">{r.reason}</div>
                <div className="mt-2 text-xs text-brand-muted">
                  Από: <Link href={`/profile/${r.reporter?.id}`} className="text-brand-mid hover:underline">
                    {r.reporter?.display_name ?? "—"}
                  </Link>
                  {" · "}
                  Στόχος:{" "}
                  {r.target_type === "profile" ? (
                    <Link href={`/profile/${r.target_id}`} className="text-brand-mid hover:underline">
                      Δες το προφίλ <Icon name="arrowRight" />
                    </Link>
                  ) : (
                    <code className="figures">{r.target_id}</code>
                  )}
                </div>
                {r.admin_note && (
                  <div className="mt-2 text-xs bg-brand-bg border border-brand-border rounded p-2">
                    <span className="eyebrow">Σημείωση admin</span> · {r.admin_note}
                  </div>
                )}
              </div>
              <ReportRowActions id={r.id} currentStatus={r.status} />
            </div>
          </Card>
        ))}
        {((reports as any[]) ?? []).length === 0 && (
          <Card>
            <div className="text-brand-muted text-sm flex items-center gap-2">
              <Icon name="info" /> Καμία αναφορά σε αυτή την κατηγορία.
            </div>
          </Card>
        )}
      </div>
    </>
  );
}
