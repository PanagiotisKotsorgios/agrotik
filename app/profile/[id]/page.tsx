import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { Card, Badge, Eyebrow, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { getProfileById, getProfileListings } from "@/lib/db/queries";
import { createSupabaseServer } from "@/lib/supabase/server";
import { roleLabel, formatRelative, priceFormat } from "@/lib/utils";
import { FavoriteButton } from "./favorite-button";

export default async function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile: any = await getProfileById(id);
  if (!profile || !profile.is_active) return notFound();

  const [{ type, listings }, supabase] = await Promise.all([
    getProfileListings(id, profile.role),
    createSupabaseServer(),
  ]);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isFavorited = false;
  let viewerRole: string | null = null;
  if (user) {
    const [fav, me] = await Promise.all([
      supabase.from("favorites").select("user_id").eq("user_id", user.id).eq("target_id", id).maybeSingle(),
      supabase.from("profiles").select("role").eq("id", user.id).single(),
    ]);
    isFavorited = !!fav.data;
    viewerRole = me.data?.role ?? null;
  }
  const viewerIsFarmer = viewerRole === "farmer";
  const canMessage = !!user && user.id !== id;

  return (
    <>
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Identity card */}
        <Card>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-4">
              <Avatar name={profile.display_name} />
              <div>
                <Eyebrow>{roleLabel(profile.role)}</Eyebrow>
                <h1 className="display text-3xl text-brand-dark leading-tight mt-1">
                  {profile.display_name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-brand-muted">
                  <Icon name="location" className="text-brand-earth" />
                  <span>{profile.regions?.name_el ?? profile.region_code}</span>
                  {profile.municipality && (
                    <>
                      <span className="text-brand-border">·</span>
                      <span>{profile.municipality}</span>
                    </>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-4 text-brand-ink/85 leading-relaxed max-w-prose">
                    {profile.bio}
                  </p>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-brand-mid hover:text-brand-dark text-sm"
                  >
                    <Icon name="globe" /> {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              {user ? (
                <a
                  href={`tel:${profile.phone}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-brand-dark text-white text-sm font-medium hover:bg-brand-mid"
                >
                  <Icon name="phone" /> {profile.phone}
                </a>
              ) : (
                <Link
                  href={`/login?next=/profile/${id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-brand-dark text-white text-sm font-medium hover:bg-brand-mid"
                >
                  <Icon name="lock" /> Σύνδεση για επικοινωνία
                </Link>
              )}

              {canMessage && (
                <Link
                  href={`/dashboard/messages/${id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md border border-brand-border text-brand-dark text-sm font-medium hover:border-brand-dark hover:bg-brand-dark/5"
                >
                  <Icon name="chat" /> Στείλε μήνυμα
                </Link>
              )}

              {viewerIsFarmer && profile.role !== "farmer" && (
                <FavoriteButton targetId={profile.id} initialFavorited={isFavorited} />
              )}

              {user && user.id !== id && (
                <Link
                  href={`/dashboard/report?target=profile&id=${id}`}
                  className="text-xs text-brand-muted hover:text-brand-dark inline-flex items-center gap-1 self-end"
                >
                  <Icon name="flag" /> Αναφορά
                </Link>
              )}
            </div>
          </div>

          {user && (
            <div className="mt-6 pt-4 border-t border-brand-border text-sm space-y-1.5">
              <div className="flex items-center gap-2 text-brand-ink/80">
                <Icon name="phone" className="text-brand-muted w-4" />
                <a className="hover:underline" href={`tel:${profile.phone}`}>{profile.phone}</a>
              </div>
              {profile.vat_number && (
                <div className="flex items-center gap-2 text-brand-ink/80">
                  <Icon name="tag" className="text-brand-muted w-4" />
                  <span>ΑΦΜ {profile.vat_number}</span>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Listings */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <Eyebrow>{type === "price" ? "Τιμοκατάλογος" : "Παραγωγή"}</Eyebrow>
              <h2 className="display text-2xl text-brand-dark mt-1 field-underline">
                {type === "price" ? "Τιμές που αγοράζει" : "Διαθέσιμη παραγωγή"}
              </h2>
            </div>
            <Badge tone="muted">{listings.length} καταχωρήσεις</Badge>
          </div>

          {listings.length === 0 ? (
            <Card>
              <div className="text-brand-muted flex items-center gap-2">
                <Icon name="info" />
                {type === "price"
                  ? "Δεν υπάρχουν καταχωρημένες τιμές."
                  : "Δεν υπάρχει καταχωρημένη παραγωγή."}
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {listings.map((l: any) =>
                type === "price" ? (
                  <Card key={l.id}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <CardTitle>{l.products.name_el}</CardTitle>
                        <div className="text-xs text-brand-muted mt-0.5 flex items-center gap-1.5">
                          <Icon name="location" /> Παραλαβή · {l.regions?.name_el ?? l.region_code}
                        </div>
                      </div>
                      <span className="eyebrow text-brand-muted">
                        Ενημέρωση {formatRelative(l.updated_at)}
                      </span>
                    </div>
                    <table className="w-full text-sm border-t border-brand-border">
                      <tbody>
                        {(l.variants ?? []).map((v: any, i: number) => (
                          <tr key={i} className="border-b border-brand-border last:border-0">
                            <td className="py-2.5 text-brand-ink/80">
                              {Object.entries(v.attributes)
                                .map(([k, val]) => `${k}: ${val}`)
                                .join(" · ") || "—"}
                            </td>
                            <td className="py-2.5 text-right figures font-semibold text-brand-dark">
                              {priceFormat(Number(v.price), l.products.unit)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {l.notes && (
                      <p className="mt-3 text-sm text-brand-muted italic border-l-2 border-brand-earth/40 pl-3">
                        {l.notes}
                      </p>
                    )}
                  </Card>
                ) : (
                  <Card key={l.id}>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{l.products.name_el}</CardTitle>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="figures text-2xl font-semibold text-brand-dark">
                            {l.quantity}
                          </span>
                          <span className="text-brand-muted">{l.unit ?? l.products.unit}</span>
                        </div>
                        {Object.keys(l.attributes ?? {}).length > 0 && (
                          <div className="text-xs text-brand-muted mt-1">
                            {Object.entries(l.attributes)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(" · ")}
                          </div>
                        )}
                        {(l.available_from || l.available_until) && (
                          <div className="text-xs text-brand-muted mt-2 inline-flex items-center gap-1.5">
                            <Icon name="calendar" />
                            {l.available_from ?? "τώρα"} → {l.available_until ?? "ανοιχτό"}
                          </div>
                        )}
                      </div>
                      <span className="eyebrow text-brand-muted">
                        {formatRelative(l.updated_at)}
                      </span>
                    </div>
                  </Card>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <div className="w-14 h-14 rounded-full bg-brand-dark text-white flex items-center justify-center font-semibold display shrink-0">
      {initials || "·"}
    </div>
  );
}
