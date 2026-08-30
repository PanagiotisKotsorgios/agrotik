import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { roleLabel } from "@/lib/utils";

export default async function DashboardHome() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*, regions(name_el)")
    .eq("id", user!.id)
    .single();

  const isBuyer = profile?.role === "merchant" || profile?.role === "factory";
  const table = isBuyer ? "price_listings" : "production_listings";
  const [{ count: listingCount }, { count: msgCount }, { count: notifCount }] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }).eq("owner_id", user!.id).eq("is_active", true),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user!.id).is("read_at", null),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user!.id).is("read_at", null),
  ]);

  return (
    <>
      <div className="mb-8">
        <Eyebrow>{roleLabel(profile?.role ?? "")} · {profile?.regions?.name_el}</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1">
          Καλωσόρισες, <span className="text-brand-earth">{profile?.display_name}</span>
        </h1>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatBox
          icon={isBuyer ? "tag" : "wheat"}
          label={isBuyer ? "Ενεργός τιμοκατάλογος" : "Ενεργές παραγωγές"}
          value={listingCount ?? 0}
          href="/dashboard/listings"
        />
        <StatBox icon="chat" label="Αδιάβαστα μηνύματα" value={msgCount ?? 0} href="/dashboard/messages" />
        <StatBox icon="bell" label="Νέες ειδοποιήσεις" value={notifCount ?? 0} href="/dashboard/notifications" />
      </div>

      <div className="mt-8">
        <h2 className="display text-xl text-brand-dark mb-3">Επόμενα βήματα</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <ActionRow icon="user" label="Ενημέρωσε τα στοιχεία σου" href="/dashboard/profile" />
          <ActionRow
            icon={isBuyer ? "tag" : "wheat"}
            label={isBuyer ? "Πρόσθεσε ή ενημέρωσε τιμές" : "Δήλωσε την παραγωγή σου"}
            href="/dashboard/listings"
          />
          {profile?.role === "farmer" && (
            <ActionRow icon="store" label="Ψάξε αγοραστές" href="/search/buyers" />
          )}
          {isBuyer && (
            <ActionRow icon="seedling" label="Ψάξε παραγωγούς" href="/search/producers" />
          )}
          <ActionRow icon="eye" label="Δες το δημόσιο προφίλ σου" href={`/profile/${profile?.id}`} />
        </div>
      </div>
    </>
  );
}

function StatBox({
  icon,
  label,
  value,
  href,
}: {
  icon: IconName;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-brand-muted">
        <Icon name={icon} />
        <span className="eyebrow">{label}</span>
      </div>
      <div className="figures text-3xl font-semibold text-brand-dark mt-2">{value}</div>
      <Link href={href} className="mt-3 inline-flex items-center gap-1 text-sm text-brand-mid hover:text-brand-dark">
        Άνοιξε <Icon name="arrowRight" />
      </Link>
    </Card>
  );
}

function ActionRow({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-md border border-brand-border bg-brand-surface hover:border-brand-dark/40"
    >
      <div className="w-9 h-9 rounded-md bg-brand-dark/8 text-brand-dark flex items-center justify-center">
        <Icon name={icon} />
      </div>
      <span className="text-sm text-brand-ink font-medium">{label}</span>
      <Icon name="arrowRight" className="text-brand-muted ml-auto" />
    </Link>
  );
}
