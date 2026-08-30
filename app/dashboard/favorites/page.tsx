import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";
import { Card, Badge, Eyebrow } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { roleLabel } from "@/lib/utils";

export default async function FavoritesPage() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("favorites")
    .select("target_id, created_at, profiles!favorites_target_id_fkey(id, display_name, role, region_code, avatar_path, regions(name_el))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const rows = (data as any[]) ?? [];

  return (
    <>
      <div className="mb-6">
        <Eyebrow>Παρακολούθηση</Eyebrow>
        <h1 className="display text-3xl text-brand-dark mt-1 field-underline">Αγαπημένα</h1>
      </div>

      {rows.length === 0 ? (
        <Card>
          <div className="text-brand-muted flex items-center gap-2">
            <Icon name="heart" />
            <span>
              Δεν έχεις αγαπημένους ακόμα. Ψάξε{" "}
              <Link href="/search/buyers" className="text-brand-mid hover:underline">αγοραστές</Link>{" "}
              και πάτησε «Παρακολούθηση» στην κάρτα τους.
            </span>
          </div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rows.map((r) => (
            <Card key={r.target_id}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-brand-dark truncate">{r.profiles.display_name}</span>
                    <Badge tone="brand">{roleLabel(r.profiles.role)}</Badge>
                  </div>
                  <div className="text-sm text-brand-muted mt-0.5 inline-flex items-center gap-1.5">
                    <Icon name="location" /> {r.profiles.regions?.name_el ?? r.profiles.region_code}
                  </div>
                </div>
                <Link
                  href={`/profile/${r.target_id}`}
                  className="text-brand-mid hover:text-brand-dark inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span className="text-sm">Δες</span> <Icon name="arrowRight" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
