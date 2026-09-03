"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { updateProfile, updateProfileMedia } from "@/lib/actions/profiles";
import { fileToResizedDataUrl } from "@/lib/domain/image-resize";
import type { Profile, Region, GalleryItem } from "@/lib/db/types";
import { isProducerRole } from "@/lib/utils";

export function ProfileEditor({ profile, regions }: { profile: Profile; regions: Region[] }) {
  const isProducer = isProducerRole(profile.role);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState<null | "avatar" | "cover" | "gallery">(null);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar_url ?? null);
  const [cover, setCover] = useState<string | null>(profile.cover_url ?? null);
  const [gallery, setGallery] = useState<GalleryItem[]>(
    Array.isArray(profile.gallery) ? profile.gallery : [],
  );

  async function handleUpload(kind: "avatar" | "cover" | "gallery", file: File | undefined) {
    if (!file) return;
    setUploading(kind);
    setMessage(null);
    try {
      const dataUrl = await fileToResizedDataUrl(file, kind === "cover" ? 1400 : 720, 0.82);
      if (kind === "avatar") {
        setAvatar(dataUrl);
        const res = await updateProfileMedia({ avatar_url: dataUrl });
        if (!res.ok) throw new Error(res.error);
      } else if (kind === "cover") {
        setCover(dataUrl);
        const res = await updateProfileMedia({ cover_url: dataUrl });
        if (!res.ok) throw new Error(res.error);
      } else {
        const next = [...gallery, { url: dataUrl, alt: file.name }].slice(0, 12);
        setGallery(next);
        const res = await updateProfileMedia({ gallery: next });
        if (!res.ok) throw new Error(res.error);
      }
      setMessage({ ok: true, text: "Η εικόνα αποθηκεύτηκε" });
    } catch (e: any) {
      setMessage({ ok: false, text: e?.message ?? "Αποτυχία μεταφόρτωσης" });
    } finally {
      setUploading(null);
    }
  }

  async function removeGalleryItem(index: number) {
    const next = gallery.filter((_, i) => i !== index);
    setGallery(next);
    await updateProfileMedia({ gallery: next });
  }

  async function removeAvatar() {
    setAvatar(null);
    await updateProfileMedia({ avatar_url: null });
  }

  async function removeCover() {
    setCover(null);
    await updateProfileMedia({ cover_url: null });
  }

  return (
    <div className="space-y-6">
      {/* Media */}
      <Card>
        <h2 className="display text-xl text-brand-dark mb-1">Εικόνες</h2>
        <p className="text-sm text-brand-muted mb-5">Οι εικόνες συμπιέζονται τοπικά πριν σταλούν.</p>

        <div className="grid sm:grid-cols-[160px_1fr] gap-6">
          {/* Avatar */}
          <div>
            <Label>Φωτογραφία προφίλ</Label>
            <div className="relative w-32 h-32 rounded-full overflow-hidden bg-brand-bg border-2 border-brand-border flex items-center justify-center">
              {avatar ? (
                <Image src={avatar} alt="avatar" width={128} height={128} className="object-cover w-full h-full" unoptimized />
              ) : (
                <Icon name="user" className="text-3xl text-brand-muted" />
              )}
            </div>
            <div className="mt-2 flex gap-2 flex-wrap">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand-dark text-white text-sm font-semibold hover:bg-brand-mid">
                <Icon name={uploading === "avatar" ? "spinner" : "image"} />
                {uploading === "avatar" ? "Ανέβασμα…" : "Αλλαγή"}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload("avatar", e.target.files?.[0])}
                />
              </label>
              {avatar && (
                <Button variant="ghost" size="sm" onClick={removeAvatar}>Αφαίρεση</Button>
              )}
            </div>
          </div>

          {/* Cover */}
          <div>
            <Label>Φωτογραφία εξωφύλλου</Label>
            <div className="relative w-full h-40 rounded-md overflow-hidden bg-brand-bg border-2 border-brand-border flex items-center justify-center">
              {cover ? (
                <Image src={cover} alt="cover" width={1400} height={400} className="object-cover w-full h-full" unoptimized />
              ) : (
                <div className="text-brand-muted inline-flex items-center gap-2"><Icon name="image" /> Καμία εικόνα</div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand-dark text-white text-sm font-semibold hover:bg-brand-mid">
                <Icon name={uploading === "cover" ? "spinner" : "image"} />
                {uploading === "cover" ? "Ανέβασμα…" : "Επιλογή cover"}
                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload("cover", e.target.files?.[0])} />
              </label>
              {cover && <Button variant="ghost" size="sm" onClick={removeCover}>Αφαίρεση</Button>}
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <Label className="mb-0">Συλλογή (μέχρι 12 φωτογραφίες)</Label>
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-brand-surface border border-brand-border text-brand-dark text-sm font-semibold hover:border-brand-dark">
              <Icon name={uploading === "gallery" ? "spinner" : "plus"} />
              {uploading === "gallery" ? "Ανέβασμα…" : "Προσθήκη"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleUpload("gallery", e.target.files?.[0])}
                disabled={gallery.length >= 12}
              />
            </label>
          </div>
          {gallery.length === 0 ? (
            <p className="text-sm text-brand-muted">Καμία φωτογραφία ακόμα.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {gallery.map((g, i) => (
                <div key={i} className="relative aspect-square rounded-md overflow-hidden bg-brand-bg border border-brand-border group">
                  <Image src={g.url} alt={g.alt ?? ""} fill className="object-cover" unoptimized />
                  <button
                    type="button"
                    onClick={() => removeGalleryItem(i)}
                    className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center text-xs"
                    aria-label="Αφαίρεση"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {message && (
          <p className={"mt-3 text-sm inline-flex items-center gap-2 " + (message.ok ? "text-emerald-700" : "text-red-700")}>
            <Icon name={message.ok ? "ok" : "triangleAlert"} /> {message.text}
          </p>
        )}
      </Card>

      {/* Fields */}
      <Card>
        <h2 className="display text-xl text-brand-dark mb-4">Στοιχεία</h2>
        <form
          className="space-y-5"
          action={(fd) =>
            start(async () => {
              const res = await updateProfile(fd);
              setMessage(res.ok ? { ok: true, text: "Αποθηκεύτηκε" } : { ok: false, text: res.error });
            })
          }
        >
          {isProducer && (
            <div className="rounded-xl border border-sky-900/20 bg-sky-50 p-4">
              <Label htmlFor="producer_role">Δραστηριότητα λογαριασμού</Label>
              <Select id="producer_role" name="producer_role" defaultValue={profile.role}>
                {profile.role === "farmer" && <option value="farmer">Αγρότης</option>}
                {profile.role === "fisher" && <option value="fisher">Αλιέας</option>}
                <option value="farmer_fisher">Αγρότης & Αλιέας</option>
              </Select>
              <p className="mt-2 text-xs leading-relaxed text-sky-950/75">
                Με τη διπλή ιδιότητα χρησιμοποιείς το ίδιο email και τηλέφωνο και καταχωρίζεις τόσο αγροτική παραγωγή όσο και αλιεύματα.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="display_name">
              {isProducer ? "Ονοματεπώνυμο" : "Επωνυμία"}
            </Label>
            <Input id="display_name" name="display_name" defaultValue={profile.display_name} required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Τηλέφωνο</Label>
              <Input id="phone" name="phone" defaultValue={profile.phone} required />
            </div>
            <div>
              <Label htmlFor="vat_number">ΑΦΜ (προαιρετικό)</Label>
              <Input id="vat_number" name="vat_number" defaultValue={profile.vat_number ?? ""} />
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="region_code">Νομός / Π.Ε.</Label>
              <Select id="region_code" name="region_code" defaultValue={profile.region_code}>
                {regions.map((r) => (
                  <option key={r.code} value={r.code}>{r.name_el}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="municipality">Δήμος</Label>
              <Input id="municipality" name="municipality" defaultValue={profile.municipality ?? ""} />
            </div>
            <div>
              <Label htmlFor="address_line">Διεύθυνση (προαιρετικό)</Label>
              <Input id="address_line" name="address_line" defaultValue={profile.address_line ?? ""} placeholder="Οδός, αριθμός, ΤΚ" />
            </div>
          </div>

          <div>
            <Label htmlFor="bio">Περιγραφή δραστηριότητας</Label>
            <Textarea id="bio" name="bio" rows={4} defaultValue={profile.bio ?? ""} />
          </div>

          <div>
            <Label htmlFor="specialties">Ειδικότητες / προϊόντα</Label>
            <Textarea id="specialties" name="specialties" rows={2} defaultValue={profile.specialties ?? ""} placeholder="π.χ. Ελιές Καλαμών, ελαιόλαδο έξτρα παρθένο, οργανική καλλιέργεια" />
          </div>

          {!isProducer && (
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year_founded">Έτος ίδρυσης</Label>
                <Input id="year_founded" name="year_founded" type="number" min="1900" max={new Date().getFullYear()} defaultValue={profile.year_founded ?? ""} />
              </div>
              <div>
                <Label htmlFor="employees_range">Προσωπικό</Label>
                <Select id="employees_range" name="employees_range" defaultValue={profile.employees_range ?? ""}>
                  <option value="">—</option>
                  <option value="1-5">1–5</option>
                  <option value="6-20">6–20</option>
                  <option value="21-50">21–50</option>
                  <option value="51-200">51–200</option>
                  <option value="200+">200+</option>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="certifications">Πιστοποιήσεις</Label>
            <Textarea id="certifications" name="certifications" rows={2} defaultValue={profile.certifications ?? ""} placeholder="π.χ. ΠΟΠ Καλαμάτας, BIO, ISO 22000" />
          </div>

          <div>
            <Label htmlFor="opening_hours">Ώρες λειτουργίας / παραλαβής</Label>
            <Textarea id="opening_hours" name="opening_hours" rows={2} defaultValue={profile.opening_hours ?? ""} placeholder="π.χ. Δευτ–Παρ 08:00–15:00, Σάββατο κατόπιν ραντεβού" />
          </div>

          <div>
            <Label htmlFor="website">Ιστότοπος (προαιρετικό)</Label>
            <Input id="website" name="website" type="url" placeholder="https://…" defaultValue={profile.website ?? ""} />
          </div>

          {isProducer && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="is_public" defaultChecked={profile.is_public} className="w-4 h-4 accent-brand-dark" />
              <span>Εμφάνιση του προφίλ μου σε αποτελέσματα αναζήτησης</span>
            </label>
          )}

          {message && (
            <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-700"}`}>{message.text}</p>
          )}
          <Button type="submit" disabled={pending} icon={pending ? "spinner" : "check"} size="lg">
            {pending ? "Αποθήκευση…" : "Αποθήκευση"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
