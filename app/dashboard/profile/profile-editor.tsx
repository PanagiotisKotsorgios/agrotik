"use client";
import { useState, useTransition } from "react";
import { Card } from "@/components/ui/card";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/lib/actions/profiles";
import type { Profile, Region } from "@/lib/db/types";

export function ProfileEditor({ profile, regions }: { profile: Profile; regions: Region[] }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  return (
    <Card>
      <form
        className="space-y-4"
        action={(fd) =>
          start(async () => {
            const res = await updateProfile(fd);
            setMessage(
              res.ok
                ? { ok: true, text: "Αποθηκεύτηκε" }
                : { ok: false, text: res.error },
            );
          })
        }
      >
        <div>
          <Label htmlFor="display_name">
            {profile.role === "farmer" ? "Ονοματεπώνυμο" : "Επωνυμία"}
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

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="region_code">Νομός/Π.Ε.</Label>
            <Select id="region_code" name="region_code" defaultValue={profile.region_code}>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name_el}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="municipality">Δήμος (προαιρετικό)</Label>
            <Input id="municipality" name="municipality" defaultValue={profile.municipality ?? ""} />
          </div>
        </div>

        <div>
          <Label htmlFor="bio">Περιγραφή δραστηριότητας</Label>
          <Textarea id="bio" name="bio" rows={3} defaultValue={profile.bio ?? ""} />
        </div>

        <div>
          <Label htmlFor="website">Website (προαιρετικό)</Label>
          <Input id="website" name="website" type="url" placeholder="https://..." defaultValue={profile.website ?? ""} />
        </div>

        {profile.role === "farmer" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_public" defaultChecked={profile.is_public} className="rounded" />
            <span>Εμφάνιση του προφίλ μου σε αποτελέσματα αναζήτησης</span>
          </label>
        )}

        {message && (
          <p className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Αποθήκευση..." : "Αποθήκευση"}
        </Button>
      </form>
    </Card>
  );
}
