import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { hasFisherRole, isProducerRole, roleLabel } from "@/lib/utils";

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
  const isProducer = isProducerRole(profile?.role);
  const isFisher = hasFisherRole(profile?.role);
  const isStockbreeder = profile?.role === "stockbreeder" || profile?.role === "farmer_stockbreeder";
  const isBeekeeper = profile?.role === "beekeeper" || profile?.role === "farmer_beekeeper";
  const isDualProducer =
    profile?.role === "farmer_fisher" ||
    profile?.role === "farmer_stockbreeder" ||
    profile?.role === "farmer_beekeeper";
  const table = isBuyer ? "price_listings" : "production_listings";
  const [{ count: listingCount }, { count: msgCount }, { count: notifCount }, { count: networkCount }] = await Promise.all([
    supabase.from(table).select("id", { count: "exact", head: true }).eq("owner_id", user.id).eq("is_active", true),
    supabase.from("messages").select("id", { count: "exact", head: true }).eq("recipient_id", user.id).is("read_at", null),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    isProducer
      ? supabase.from("favorites").select("target_id", { count: "exact", head: true }).eq("user_id", user.id)
      : supabase.from("deal_marks").select("id", { count: "exact", head: true }).eq("target_id", user.id),
  ]);

  const firstName = (profile?.display_name ?? "").split(/\s+/)[0] ?? "";

  return (
    <>
      <div className="mb-8">
        <Eyebrow>{roleLabel(profile?.role ?? "")} · {profile?.regions?.name_el}{profile?.municipality ? ` · ${profile?.municipality}` : ""}</Eyebrow>
        <h1 className="display text-2xl sm:text-3xl text-brand-dark mt-2 leading-snug">
          Καλωσόρισες, <span className="text-brand-earth">{firstName || profile?.display_name}</span>
        </h1>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <StatBox
          icon={
            isBuyer
              ? "tag"
              : isBeekeeper
                ? "hive"
                : isStockbreeder
                  ? "cow"
                  : isFisher
                    ? "fish"
                    : "wheat"
          }
          label={
            isBuyer
              ? "Τιμοκατάλογος"
              : profile?.role === "farmer_fisher"
                ? "Παραγωγή & αλιεύματα"
                : profile?.role === "farmer_stockbreeder"
                  ? "Παραγωγή & κτηνοτροφικά"
                  : profile?.role === "farmer_beekeeper"
                    ? "Παραγωγή & μελισσοκομικά"
                    : isBeekeeper
                      ? "Μελισσοκομικά"
                      : isStockbreeder
                        ? "Κτηνοτροφικά"
                        : isFisher
                          ? "Αλιεύματα"
                          : "Παραγωγές"
          }
          value={listingCount ?? 0}
          href="/dashboard/listings"
          tone={isFisher ? "fisher" : "dark"}
        />
        <StatBox
          icon={isProducer ? "heart" : "users"}
          label={isProducer ? "Αγαπημένοι" : "Πελάτες"}
          value={networkCount ?? 0}
          href="/dashboard/network"
          tone="olive"
        />
        <StatBox icon="chat" label="Μηνύματα" value={msgCount ?? 0} href="/dashboard/messages" tone="cream" />
        <StatBox icon="bell" label="Ειδοποιήσεις" value={notifCount ?? 0} href="/dashboard/notifications" tone="cream" />
      </div>

      <div className="mt-10">
        <h2 className="display text-xl text-brand-dark mb-3">Τι θα κάνεις τώρα</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <ActionRow icon="user" label="Ενημέρωσε το προφίλ" href="/dashboard/profile" tone="dark" />
          <ActionRow
            icon={isProducer ? (isFisher ? "fish" : "wheat") : "tag"}
            label={isProducer
              ? isDualProducer
                ? "Δήλωσε παραγωγή ή αλίευμα"
                : isFisher
                  ? "Δήλωσε αλίευμα"
                  : "Δήλωσε παραγωγή"
              : "Ενημέρωσε τιμές"}
            href="/dashboard/listings"
            tone={isFisher ? "fisher" : "dark"}
          />
          {isProducer && <ActionRow icon="store" label="Δες αγοραστές" href="/search/buyers" tone="dark" />}
          {isBuyer && <ActionRow icon="seedling" label="Δες παραγωγούς & αλιείς" href="/search/producers" tone="dark" />}
          <ActionRow icon="eye" label="Το δημόσιο προφίλ σου" href={`/profile/${profile?.id}`} tone="dark" />
          {isProducer && <ActionRow icon="heart" label="Οι αγοραστές σου" href="/dashboard/network" tone="dark" />}
          {isBuyer && <ActionRow icon="users" label="Οι πελάτες σου" href="/dashboard/network" tone="dark" />}
        </div>
      </div>
    </>
  );
}

type Tone = "dark" | "fisher" | "olive" | "brand" | "earth" | "cream";
const statTones: Record<Tone, string> = {
  dark: "bg-brand-dark text-white border-brand-dark",
  fisher: "bg-sky-900 text-white border-sky-950",
  olive: "bg-brand-olive/95 text-white border-brand-olive",
  brand: "bg-brand-mid text-white border-brand-mid",
  earth: "bg-brand-earth text-white border-brand-earth",
  cream: "bg-brand-bg text-brand-ink border-brand-border",
};

function StatBox({
  icon,
  label,
  value,
  href,
  tone,
}: {
  icon: IconName;
  label: string;
  value: number;
  href: string;
  tone: Tone;
}) {
  const cls = statTones[tone];
  const light = tone === "cream";
  return (
    <Link
      href={href}
      className={"block border rounded-2xl p-5 shadow-card hover:shadow-elev transition-all " + cls}
    >
      <div className={"flex items-center gap-2 " + (light ? "text-brand-muted" : "text-white/80")}>
        <Icon name={icon} className="text-[1.1em]" />
        <span className="text-[12px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={"figures text-4xl font-semibold mt-3 " + (light ? "text-brand-dark" : "text-white")}>
        {value}
      </div>
      <div className={"mt-3 text-sm font-semibold inline-flex items-center gap-1 " + (light ? "text-brand-mid" : "text-white/90")}>
        Άνοιξε <Icon name="arrowRight" className="text-[0.85em]" />
      </div>
    </Link>
  );
}

const rowTones: Record<Tone, { bg: string; icon: string; iconBg: string; text: string }> = {
  dark: { bg: "bg-brand-dark text-white border-brand-dark", icon: "text-white", iconBg: "bg-white/15", text: "text-white" },
  fisher: { bg: "bg-sky-900 text-white border-sky-950", icon: "text-white", iconBg: "bg-white/15", text: "text-white" },
  olive: { bg: "bg-brand-olive/10 border-brand-olive/25", icon: "text-brand-olive", iconBg: "bg-brand-olive/20", text: "text-brand-dark" },
  brand: { bg: "bg-brand-dark/8 border-brand-dark/15", icon: "text-brand-dark", iconBg: "bg-brand-dark/12", text: "text-brand-dark" },
  earth: { bg: "bg-brand-earth/10 border-brand-earth/25", icon: "text-brand-earth", iconBg: "bg-brand-earth/20", text: "text-brand-ink" },
  cream: { bg: "bg-brand-bg border-brand-border", icon: "text-brand-muted", iconBg: "bg-brand-border/50", text: "text-brand-ink" },
};

function ActionRow({ icon, label, href, tone }: { icon: IconName; label: string; href: string; tone: Tone }) {
  const t = rowTones[tone];
  return (
    <Link
      href={href}
      className={"flex items-center gap-4 p-4 rounded-xl border transition-all hover:shadow-elev hover:-translate-y-0.5 " + t.bg}
    >
      <div className={"w-11 h-11 rounded-lg flex items-center justify-center shrink-0 " + t.iconBg + " " + t.icon}>
        <Icon name={icon} className="text-[1.1em]" />
      </div>
      <span className={"text-[15.5px] font-semibold " + t.text}>{label}</span>
      <Icon name="arrowRight" className={"ml-auto " + t.icon} />
    </Link>
  );
}
