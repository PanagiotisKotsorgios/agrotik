import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";

export default async function InboxPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("messages")
    .select("id, body, sender_id, recipient_id, read_at, created_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(500);

  // Group by peer id
  const peers = new Map<string, { last: any; unread: number }>();
  for (const m of (data as any[]) ?? []) {
    const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
    const entry = peers.get(peer);
    if (!entry) peers.set(peer, { last: m, unread: 0 });
    if (m.recipient_id === user.id && !m.read_at) {
      const e = peers.get(peer)!;
      e.unread += 1;
    }
  }

  const peerIds = [...peers.keys()];
  const { data: profs } = peerIds.length
    ? await supabase.from("profiles").select("id, display_name, role, regions(name_el)").in("id", peerIds)
    : { data: [] as any[] };
  const profMap = new Map((profs as any[]).map((p) => [p.id, p]));

  const rows = [...peers.entries()]
    .sort((a, b) => b[1].last.created_at.localeCompare(a[1].last.created_at))
    .map(([id, v]) => ({ peer: profMap.get(id) ?? { id, display_name: "Χρήστης", role: "" }, ...v }));

  return (
    <>
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <Eyebrow>Επικοινωνία</Eyebrow>
          <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Μηνύματα</h1>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="text-brand-muted flex items-center gap-2">
            <Icon name="inbox" /> Δεν υπάρχουν μηνύματα. Άνοιξε προφίλ και πάτησε «Στείλε μήνυμα».
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r: any) => (
            <Link
              key={r.peer.id}
              href={`/dashboard/messages/${r.peer.id}`}
              className="block bg-brand-surface border border-brand-border rounded-card p-4 hover:border-brand-dark/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand-dark truncate">{r.peer.display_name}</span>
                    {r.unread > 0 && <Badge tone="olive">{r.unread} νέα</Badge>}
                  </div>
                  <div className="text-sm text-brand-muted mt-0.5 truncate">
                    {r.last.sender_id === (r.peer.id) ? "" : "Εσύ: "}{r.last.body}
                  </div>
                </div>
                <span className="eyebrow text-brand-muted shrink-0">{formatRelative(r.last.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
