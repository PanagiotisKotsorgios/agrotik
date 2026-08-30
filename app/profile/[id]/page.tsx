export const dynamic = "force-dynamic";

import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { Card, Badge, Eyebrow, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
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
  const gallery: { url: string; alt?: string }[] = Array.isArray(profile.gallery) ? profile.gallery : [];

  return (
    <>
      <Header />

      {/* Cover */}
      <div className="relative w-full h-56 sm:h-72 bg-brand-dark overflow-hidden">
        {profile.cover_url ? (
          <Image src={profile.cover_url} alt="" fill className="object-cover opacity-95" unoptimized />
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #1B4D2E 0%, #3F8B34 55%, #6B7F3F 100%)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/80 via-brand-dark/20 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-20 relative z-10 pb-10 space-y-6">
        {/* Identity card */}
        <Card className="!pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <Avatar url={profile.avatar_url} name={profile.display_name} />
              <div className="min-w-0">
                <Eyebrow>{roleLabel(profile.role)}</Eyebrow>
                <h1 className="display text-3xl sm:text-4xl text-brand-dark leading-tight mt-1">
                  {profile.display_name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-brand-muted">
                  <span className="inline-flex items-center gap-1.5">
                    <Icon name="location" className="text-brand-earth" />
                    {profile.regions?.name_el ?? profile.region_code}
                    {profile.municipality && ` · ${profile.municipality}`}
                  </span>
                  {profile.year_founded && (
                    <>
                      <span className="text-brand-border">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="calendar" /> Από το {profile.year_founded}
                      </span>
                    </>
                  )}
                  {profile.employees_range && (
                    <>
                      <span className="text-brand-border">·</span>
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="users" /> {profile.employees_range}
                      </span>
                    </>
                  )}
                </div>
                {profile.bio && (
                  <p className="mt-4 text-brand-ink/90 leading-relaxed max-w-prose">{profile.bio}</p>
                )}
                {profile.website && (
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 text-brand-mid hover:text-brand-dark text-sm font-semibold"
                  >
                    <Icon name="globe" /> {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2 shrink-0">
              {/* Free-to-all contact button — no login gate */}
              <a
                href={`tel:${profile.phone}`}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-brand-dark text-white text-[15px] font-semibold hover:bg-brand-mid"
              >
                <Icon name="phone" /> {profile.phone}
              </a>

              {canMessage && (
                <Link
                  href={`/dashboard/messages/${id}`}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-brand-border text-brand-dark text-[15px] font-semibold hover:border-brand-dark hover:bg-brand-dark/5"
                >
                  <Icon name="chat" /> Στείλε μήνυμα
                </Link>
              )}

              {user && user.id !== id && viewerRole !== "admin" && (
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

          {/* Full contact info — always visible */}
          <div className="mt-6 pt-4 border-t border-brand-border grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <InfoRow icon="phone" label="Τηλέφωνο">
              <a className="hover:underline" href={`tel:${profile.phone}`}>{profile.phone}</a>
            </InfoRow>
            {profile.vat_number && <InfoRow icon="tag" label="ΑΦΜ">{profile.vat_number}</InfoRow>}
            {profile.address_line && <InfoRow icon="mapLocation" label="Διεύθυνση">{profile.address_line}</InfoRow>}
            {profile.opening_hours && <InfoRow icon="calendar" label="Ώρες">{profile.opening_hours}</InfoRow>}
            {profile.certifications && <InfoRow icon="shield" label="Πιστοποιήσεις">{profile.certifications}</InfoRow>}
            {profile.specialties && <InfoRow icon="wheat" label="Ειδικότητες">{profile.specialties}</InfoRow>}
            {profile.website && (
              <InfoRow icon="globe" label="Ιστότοπος">
                <a href={profile.website} target="_blank" rel="noreferrer" className="hover:underline text-brand-mid">
                  {profile.website.replace(/^https?:\/\//, "")}
                </a>
              </InfoRow>
            )}
          </div>

          {/* Sign-in nudge for extra features */}
          {!user && (
            <div className="mt-4 pt-4 border-t border-brand-border flex flex-wrap items-center justify-between gap-3 bg-brand-bg/60 -mx-6 -mb-6 px-6 pb-6 rounded-b-card">
              <div className="text-sm text-brand-muted">
                <Icon name="info" className="text-brand-dark mr-1.5" />
                Θέλεις μηνύματα, αγαπημένα και ειδοποιήσεις τιμών;
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/login?next=/profile/${id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md border-2 border-brand-mid text-brand-dark text-sm font-semibold hover:bg-brand-mid hover:text-white"
                >
                  <Icon name="unlock" /> Σύνδεση
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-dark text-white text-sm font-semibold hover:bg-brand-mid"
                >
                  Δωρεάν εγγραφή
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Gallery */}
        {gallery.length > 0 && (
          <div>
            <div className="flex items-baseline justify-between mb-3">
              <Eyebrow>Φωτογραφίες</Eyebrow>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {gallery.map((g, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-brand-bg border border-brand-border">
                  <Image src={g.url} alt={g.alt ?? ""} fill className="object-cover hover:scale-105 transition-transform duration-500" unoptimized sizes="(max-width: 640px) 50vw, 25vw" />
                </div>
              ))}
            </div>
          </div>
        )}

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
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <CardTitle>{l.title || l.products.name_el}</CardTitle>
                        {l.title && (
                          <div className="text-sm text-brand-muted">{l.products.name_el}</div>
                        )}
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
                        {l.notes && (
                          <p className="mt-3 text-sm text-brand-muted italic border-l-2 border-brand-earth/40 pl-3">{l.notes}</p>
                        )}
                      </div>
                      <span className="eyebrow text-brand-muted shrink-0">
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
      <Footer />
    </>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    return (
      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden shrink-0 border-4 border-white shadow-elev -mt-14 sm:-mt-16 bg-white">
        <Image src={url} alt={name} width={112} height={112} className="object-cover w-full h-full" unoptimized />
      </div>
    );
  }
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "·";
  return (
    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-brand-dark text-white text-2xl flex items-center justify-center font-semibold display shrink-0 border-4 border-white shadow-elev -mt-14 sm:-mt-16">
      {initials}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon name={icon} className="text-brand-muted mt-1 w-4 shrink-0" />
      <div className="min-w-0">
        <div className="eyebrow text-brand-muted">{label}</div>
        <div className="text-brand-ink">{children}</div>
      </div>
    </div>
  );
}
