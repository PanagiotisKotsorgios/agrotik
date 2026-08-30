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
    .eq("id", user.id)
    .single();

  const isBuyer = profile?.role === "merchant" || profile?.role === "factory";
  const isFarmer = profile?.role === "farmer";
  const table = isBuyer ? "price_listings" : "production_listings";
  const [{ count: listingCount }, { count: msgCount }, { count: notifCount }, { count: networkCount }] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("is_active", true),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    isFarmer
      ? supabase.from("favorites").select("target_id", { count: "exact", head: true }).eq("user_id", user.id)
      : supabase.from("deal_marks").select("id", { count: "exact", head: true }).eq("target_id", user.id),
  ]);

  return (
    <>
      <div className="mb-10">
        <Eyebrow>{roleLabel(profile?.role ?? "")} · {profile?.regions?.name_el}{profile?.municipality ? ` · ${profile?.municipality}` : ""}</Eyebrow>
        <h1 className="display text-4xl sm:text-5xl text-brand-dark mt-2 leading-tight">
          Καλωσόρισες, <span className="text-brand-earth">{profile?.display_name}</span>
        </h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox
          icon={isBuyer ? "tag" : "wheat"}
          label={isBuyer ? "Ενεργός τιμοκατάλογος" : "Ενεργές παραγωγές"}
          value={listingCount ?? 0}
          href="/dashboard/listings"
        />
        <StatBox
          icon={isFarmer ? "heart" : "users"}
          label={isFarmer ? "Αγαπημένοι έμποροι" : "Πελάτες μου"}
          value={networkCount ?? 0}
          href="/dashboard/network"
        />
        <StatBox icon="chat" label="Αδιάβαστα μηνύματα" value={msgCount ?? 0} href="/dashboard/messages" />
        <StatBox icon="bell" label="Νέες ειδοποιήσεις" value={notifCount ?? 0} href="/dashboard/notifications" />
      </div>

      <div className="mt-12">
        <h2 className="display text-2xl text-brand-dark mb-4 field-underline">Επόμενα βήματα</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <ActionRow icon="user" label="Ενημέρωσε τα στοιχεία σου" href="/dashboard/profile" />
          <ActionRow
            icon={isFarmer ? "wheat" : "tag"}
            label={isFarmer ? "Δήλωσε την παραγωγή σου" : "Πρόσθεσε ή ενημέρωσε τιμές"}
            href="/dashboard/listings"
          />
          {isFarmer && (
            <ActionRow icon="store" label="Ψάξε αγοραστές" href="/search/buyers" />
          )}
          {isBuyer && (
            <ActionRow icon="seedling" label="Ψάξε παραγωγούς" href="/search/producers" />
          )}
          <ActionRow icon="eye" label="Δες το δημόσιο προφίλ σου" href={`/profile/${profile?.id}`} />
          {isFarmer && (
            <ActionRow icon="heart" label="Οι έμποροί μου" href="/dashboard/network" />
          )}
          {isBuyer && (
            <ActionRow icon="users" label="Οι πελάτες μου" href="/dashboard/network" />
          )}
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
    <Link
      href={href}
      className="block bg-white border border-brand-border rounded-card p-5 shadow-card hover:border-brand-dark/40 hover:shadow-elev transition-all"
    >
      <div className="flex items-center gap-2 text-brand-muted">
        <Icon name={icon} className="text-[1.1em]" />
        <span className="text-[13px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="figures text-4xl font-semibold text-brand-dark mt-3">{value}</div>
      <div className="mt-3 text-sm text-brand-mid font-semibold inline-flex items-center gap-1">
        Άνοιξε <Icon name="arrowRight" className="text-[0.85em]" />
      </div>
    </Link>
  );
}

function ActionRow({ icon, label, href }: { icon: IconName; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 rounded-lg border border-brand-border bg-white hover:border-brand-dark/40 hover:bg-brand-bg/40 transition-colors"
    >
      <div className="w-11 h-11 rounded-lg bg-brand-dark/8 text-brand-dark flex items-center justify-center shrink-0">
        <Icon name={icon} className="text-[1.05em]" />
      </div>
      <span className="text-[16px] text-brand-ink font-semibold">{label}</span>
      <Icon name="arrowRight" className="text-brand-muted ml-auto text-[1.05em]" />
    </Link>
  );
}
