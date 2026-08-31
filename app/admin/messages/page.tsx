import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative } from "@/lib/utils";

export default async function AdminMessagesPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("messages")
    .select("id, body, sender_id, recipient_id, read_at, created_at")
    .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(500);

  const peers = new Map<string, { last: any; unread: number }>();
  for (const message of (data as any[]) ?? []) {
    const peerId = message.sender_id === user.id ? message.recipient_id : message.sender_id;
    if (!peers.has(peerId)) peers.set(peerId, { last: message, unread: 0 });
    if (message.recipient_id === user.id && !message.read_at) peers.get(peerId)!.unread += 1;
  }

  const peerIds = [...peers.keys()];
  const svc = createSupabaseService();
  const { data: profiles } = peerIds.length
    ? await svc.from("profiles").select("id, display_name, role").in("id", peerIds)
    : { data: [] as any[] };
  const profileById = new Map((profiles as any[]).map((profile) => [profile.id, profile]));
  const rows = [...peers.entries()]
    .sort((a, b) => b[1].last.created_at.localeCompare(a[1].last.created_at))
    .map(([id, value]) => ({ peer: profileById.get(id) ?? { id, display_name: "Διαγραμμένος χρήστης" }, ...value }));

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Επικοινωνία χρηστών</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Μηνύματα</h1>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="text-brand-muted flex items-center gap-2">
            <Icon name="inbox" /> Δεν υπάρχουν συνομιλίες ακόμη. Στείλε μήνυμα από τη διαχείριση χρηστών.
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((row: any) => (
            <Link
              key={row.peer.id}
              href={`/admin/messages/${row.peer.id}`}
              className="block bg-brand-surface border border-brand-border rounded-card p-4 hover:border-brand-dark/40"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-brand-dark truncate">{row.peer.display_name}</span>
                    {row.unread > 0 && <Badge tone="olive">{row.unread} νέα</Badge>}
                  </div>
                  <div className="text-sm text-brand-muted mt-0.5 truncate">
                    {row.last.sender_id === user.id ? "Εσύ: " : ""}{row.last.body}
                  </div>
                </div>
                <span className="eyebrow text-brand-muted shrink-0">{formatRelative(row.last.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
