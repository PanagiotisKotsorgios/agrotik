import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Eyebrow, Badge } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { roleLabel, formatRelative } from "@/lib/utils";

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const tab = (params.tab as "favorites" | "deals") || "favorites";
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = me?.role ?? "farmer";
  const isFarmer = role === "farmer";
  const isFactory = role === "factory";
  const title = isFarmer
    ? "Οι έμποροί μου"
    : isFactory
    ? "Οι συνεργάτες μου"
    : "Οι πελάτες μου";
  const description = isFarmer
    ? "Αγοραστές που παρακολουθείς και αυτοί με τους οποίους έχεις κλείσει συμφωνία."
    : isFactory
    ? "Παραγωγοί που προμηθεύεσαι, έμποροι-μεσίτες συνεργάτες, και αγαπημένα προφίλ."
    : "Παραγωγοί με τους οποίους έχεις κλείσει συμφωνία μέσω της πλατφόρμας.";

  const [favResp, dealResp] = await Promise.all([
    supabase
      .from("favorites")
      .select(
        "target_id, created_at, profiles!favorites_target_id_fkey(id, display_name, role, region_code, municipality, avatar_url, regions(name_el))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    // Deals: farmers → merchants they marked; merchants → farmers who marked them
    isFarmer
      ? supabase
          .from("deal_marks")
          .select(
            "target_id, created_at, profiles!deal_marks_target_id_fkey(id, display_name, role, region_code, municipality, avatar_url, regions(name_el)), products(name_el)",
          )
          .eq("farmer_id", user.id)
          .order("created_at", { ascending: false })
      : supabase
          .from("deal_marks")
          .select(
            "farmer_id, created_at, profiles!deal_marks_farmer_id_fkey(id, display_name, role, region_code, municipality, avatar_url, regions(name_el)), products(name_el)",
          )
          .eq("target_id", user.id)
          .order("created_at", { ascending: false }),
  ]);

  const favorites = (favResp.data as any[]) ?? [];
  const deals = (dealResp.data as any[]) ?? [];

  const tabs: { key: "favorites" | "deals"; label: string; count: number; icon: any }[] = isFarmer
    ? [
        { key: "favorites", label: "Αγαπημένοι", count: favorites.length, icon: "heart" },
        { key: "deals", label: "Πούλησα σε…", count: deals.length, icon: "check" },
      ]
    : [
        { key: "deals", label: isFactory ? "Παραγωγοί" : "Πελάτες", count: deals.length, icon: "check" },
        { key: "favorites", label: "Αγαπημένοι", count: favorites.length, icon: "heart" },
      ];

  return (
    <>
      <div className="mb-8">
        <Eyebrow>Δίκτυο</Eyebrow>
        <h1 className="display text-3xl sm:text-4xl text-brand-dark mt-1 field-underline">{title}</h1>
        <p className="mt-3 text-brand-muted text-[16px]">{description}</p>
      </div>

      <div className="flex gap-2 mb-6 border-b border-brand-border">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === (isFarmer ? "favorites" : "deals") ? "/dashboard/network" : `/dashboard/network?tab=${t.key}`}
            className={
              tab === t.key
                ? "inline-flex items-center gap-2 px-4 py-3 border-b-2 border-brand-dark font-semibold text-brand-dark text-[15px] -mb-px"
                : "inline-flex items-center gap-2 px-4 py-3 border-b-2 border-transparent text-brand-muted hover:text-brand-dark text-[15px]"
            }
          >
            <Icon name={t.icon} />
            {t.label}
            <Badge tone="muted" className="!text-[11px]">{t.count}</Badge>
          </Link>
        ))}
      </div>

      {tab === "favorites" ? (
        <FavoritesGrid items={favorites} isFarmer={isFarmer} />
      ) : (
        <DealsGrid items={deals} viewerIsFarmer={isFarmer} />
      )}
    </>
  );
}

function FavoritesGrid({ items, isFarmer }: { items: any[]; isFarmer: boolean }) {
  if (items.length === 0) {
    return (
      <Card>
        <div className="text-brand-muted flex items-center gap-2 text-[15px]">
          <Icon name="heart" />
          <span>
            Δεν έχεις αγαπημένους ακόμα. Άνοιξε την{" "}
            <Link href={isFarmer ? "/search/buyers" : "/search/producers"} className="text-brand-mid hover:underline">αναζήτηση</Link>{" "}
            και πάτησε «Παρακολούθηση» σε προφίλ που σε ενδιαφέρουν.
          </span>
        </div>
      </Card>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((r) => (
        <PersonCard
          key={r.target_id}
          id={r.profiles.id}
          name={r.profiles.display_name}
          role={r.profiles.role}
          avatar={r.profiles.avatar_url}
          region={r.profiles.regions?.name_el ?? r.profiles.region_code}
          municipality={r.profiles.municipality}
          meta={`Παρακολούθηση από ${formatRelative(r.created_at)}`}
        />
      ))}
    </div>
  );
}

function DealsGrid({ items, viewerIsFarmer }: { items: any[]; viewerIsFarmer: boolean }) {
  if (items.length === 0) {
    return (
      <Card>
        <div className="text-brand-muted flex items-center gap-2 text-[15px]">
          <Icon name="info" />
          <span>
            Δεν υπάρχουν καταγεγραμμένες συμφωνίες ακόμα.
            {viewerIsFarmer && (
              <> Όταν κλείσεις συμφωνία, μπορείς να πατήσεις «Σημείωσε ως κλεισμένη» στο προφίλ του αγοραστή.</>
            )}
          </span>
        </div>
      </Card>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 gap-4">
      {items.map((r, i) => {
        const p = r.profiles;
        return (
          <PersonCard
            key={`${p.id}-${i}`}
            id={p.id}
            name={p.display_name}
            role={p.role}
            avatar={p.avatar_url}
            region={p.regions?.name_el ?? p.region_code}
            municipality={p.municipality}
            meta={`${r.products?.name_el ? r.products.name_el + " · " : ""}${formatRelative(r.created_at)}`}
          />
        );
      })}
    </div>
  );
}

function PersonCard({
  id,
  name,
  role,
  avatar,
  region,
  municipality,
  meta,
}: {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  region: string;
  municipality?: string | null;
  meta?: string;
}) {
  return (
    <Link
      href={`/profile/${id}`}
      prefetch
      className="group flex items-center gap-4 bg-white border border-brand-border rounded-card p-4 hover:border-brand-dark/40 hover:shadow-elev transition-all"
    >
      <AvatarBadge url={avatar} name={name} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-brand-dark truncate text-[16px] group-hover:underline">{name}</span>
          <Badge tone="brand">{roleLabel(role)}</Badge>
        </div>
        <div className="text-[13px] text-brand-muted mt-1 inline-flex items-center gap-1.5">
          <Icon name="location" />
          <span className="truncate">{region}{municipality ? ` · ${municipality}` : ""}</span>
        </div>
        {meta && <div className="eyebrow text-brand-muted mt-1">{meta}</div>}
      </div>
      <Icon name="arrowRight" className="text-brand-muted group-hover:text-brand-dark shrink-0" />
    </Link>
  );
}

function AvatarBadge({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="w-14 h-14 rounded-full object-cover shrink-0 border-2 border-white shadow-sm bg-brand-bg"
      />
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";
  return (
    <div className="w-14 h-14 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0 text-lg">
      {initials}
    </div>
  );
}
