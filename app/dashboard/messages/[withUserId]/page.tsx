import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { formatRelative, roleBadgeTone, roleLabel } from "@/lib/utils";
import { markThreadRead } from "@/lib/actions/messages";
import { MessageComposer } from "./composer";
import { LiveThread } from "./live-thread";
import { createSupabaseService } from "@/lib/supabase/service";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ withUserId: string }>;
}) {
  const { withUserId } = await params;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.id === withUserId) return notFound();

  const svc = createSupabaseService();
  const { data: peer } = await svc
    .from("profiles")
    .select("id, display_name, role, regions(name_el)")
    .eq("id", withUserId)
    .single();
  if (!peer) return notFound();

  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${withUserId}),and(sender_id.eq.${withUserId},recipient_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true })
    .limit(500);

  // Mark unread messages from peer as read (best-effort)
  await markThreadRead(withUserId);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/dashboard/messages" className="text-brand-muted hover:text-brand-dark text-sm inline-flex items-center gap-1.5">
            <Icon name="arrowLeft" /> Όλες οι συνομιλίες
          </Link>
          <div className="mt-2 flex items-center gap-2">
            <h1 className="display text-2xl text-brand-dark">{(peer as any).display_name}</h1>
            <Badge tone={roleBadgeTone((peer as any).role)}>{roleLabel((peer as any).role)}</Badge>
          </div>
          <div className="text-sm text-brand-muted mt-0.5 inline-flex items-center gap-1.5">
            <Icon name="location" /> {(peer as any).regions?.name_el ?? ""}
          </div>
        </div>
        <Link
          href={`/profile/${withUserId}`}
          className="text-sm text-brand-mid hover:text-brand-dark inline-flex items-center gap-1.5"
        >
          Δες προφίλ <Icon name="arrowRight" />
        </Link>
      </div>

      <Card className="p-0 overflow-hidden">
        <LiveThread userId={user.id} peerId={withUserId} initial={(msgs as any[]) ?? []} />
        <div className="border-t border-brand-border p-4 bg-brand-bg">
          <MessageComposer recipientId={withUserId} />
        </div>
      </Card>
    </>
  );
}
