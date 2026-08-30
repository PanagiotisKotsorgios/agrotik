"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const updateSchema = z.object({
  display_name: z.string().min(2),
  phone: z.string().min(6),
  region_code: z.string().min(1),
  municipality: z.string().optional(),
  address_line: z.string().optional(),
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  vat_number: z.string().optional(),
  year_founded: z.coerce.number().int().optional(),
  employees_range: z.string().optional(),
  certifications: z.string().optional(),
  specialties: z.string().optional(),
  opening_hours: z.string().optional(),
  is_public: z.coerce.boolean().optional(),
});

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
      is_public: d.is_public ?? true,
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
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const patch: Record<string, unknown> = {};
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url;
  if (input.cover_url !== undefined) patch.cover_url = input.cover_url;
  if (input.gallery !== undefined) patch.gallery = input.gallery.slice(0, 12);

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
