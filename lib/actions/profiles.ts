"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";
import { isProducerRole, safeHttpUrl } from "@/lib/utils";

const optionalYear = z.preprocess(
  (value) => value === "" || value === null ? undefined : value,
  z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional(),
);

const updateSchema = z.object({
  display_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  region_code: z.string().min(1),
  municipality: z.string().trim().max(120).optional(),
  address_line: z.string().trim().max(240).optional(),
  bio: z.string().trim().max(2000).optional(),
  website: z.string().trim().url().max(2048).refine((value) => safeHttpUrl(value) !== null, "Ο ιστότοπος πρέπει να χρησιμοποιεί http ή https").optional().or(z.literal("")),
  vat_number: z.string().trim().max(30).optional(),
  year_founded: optionalYear,
  employees_range: z.string().trim().max(80).optional(),
  certifications: z.string().trim().max(1000).optional(),
  specialties: z.string().trim().max(1000).optional(),
  opening_hours: z.string().trim().max(500).optional(),
  is_public: z.coerce.boolean().optional(),
  producer_role: z.enum(["farmer", "fisher", "farmer_fisher"]).optional(),
});

function isSafeMediaUrl(value: string): boolean {
  if (/^data:image\/(?:jpeg|png|webp);base64,/i.test(value)) return value.length <= 2_800_000;
  if (value.length > 2048) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

const mediaUrlSchema = z.string().refine(isSafeMediaUrl, "Μη έγκυρη ή πολύ μεγάλη εικόνα").nullable();
const profileMediaSchema = z.object({
  avatar_url: mediaUrlSchema.optional(),
  cover_url: mediaUrlSchema.optional(),
  gallery: z.array(z.object({
    url: z.string().refine(isSafeMediaUrl, "Μη έγκυρη ή πολύ μεγάλη εικόνα"),
    alt: z.string().trim().max(160).optional(),
  })).max(12).optional(),
}).refine(
  (value) => (value.gallery ?? []).reduce((total, item) => total + item.url.length, 0) <= 16_000_000,
  "Η συλλογή εικόνων είναι πολύ μεγάλη",
);

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const raw: Record<string, string | boolean> = {};
  for (const [k, v] of formData.entries()) {
    raw[k] = v as string;
  }
  raw.is_public = raw.is_public === "on" || raw.is_public === "true";
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const d = parsed.data;
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role, is_public")
    .eq("id", user.id)
    .single();
  if (!currentProfile) return { ok: false, error: "Το προφίλ δεν βρέθηκε" };

  let nextProducerRole: "farmer" | "fisher" | "farmer_fisher" | undefined;
  if (d.producer_role) {
    const allowedTransitions: Record<string, Array<typeof d.producer_role>> = {
      farmer: ["farmer", "farmer_fisher"],
      fisher: ["fisher", "farmer_fisher"],
      farmer_fisher: ["farmer_fisher"],
    };
    if (!currentProfile || !allowedTransitions[currentProfile.role]?.includes(d.producer_role)) {
      return { ok: false, error: "Η αλλαγή δραστηριότητας δεν επιτρέπεται" };
    }
    nextProducerRole = d.producer_role;
  }
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: d.display_name,
      phone: d.phone,
      region_code: d.region_code,
      municipality: d.municipality || null,
      address_line: d.address_line || null,
      bio: d.bio || null,
      website: d.website || null,
      vat_number: d.vat_number || null,
      year_founded: d.year_founded ?? null,
      employees_range: d.employees_range || null,
      certifications: d.certifications || null,
      specialties: d.specialties || null,
      opening_hours: d.opening_hours || null,
      // Buyers do not currently render this checkbox. Omitting the field must
      // preserve their existing visibility instead of silently hiding them.
      ...(isProducerRole(currentProfile.role)
        ? { is_public: d.is_public ?? false }
        : { is_public: currentProfile.is_public }),
      ...(nextProducerRole ? { role: nextProducerRole } : {}),
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/profile");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

export async function updateProfileMedia(input: {
  avatar_url?: string | null;
  cover_url?: string | null;
  gallery?: { url: string; alt?: string }[];
}): Promise<ActionResult> {
  const parsed = profileMediaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα εικόνας" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const patch: Record<string, unknown> = {};
  if (parsed.data.avatar_url !== undefined) patch.avatar_url = parsed.data.avatar_url;
  if (parsed.data.cover_url !== undefined) patch.cover_url = parsed.data.cover_url;
  if (parsed.data.gallery !== undefined) patch.gallery = parsed.data.gallery;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
