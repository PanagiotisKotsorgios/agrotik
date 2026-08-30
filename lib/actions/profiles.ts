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
  bio: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  vat_number: z.string().optional(),
  is_public: z.coerce.boolean().optional(),
});

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const raw = Object.fromEntries(formData);
  // convert checkbox
  const parsed = updateSchema.safeParse({
    ...raw,
    is_public: raw.is_public === "on" || raw.is_public === "true",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.display_name,
      phone: parsed.data.phone,
      region_code: parsed.data.region_code,
      municipality: parsed.data.municipality || null,
      bio: parsed.data.bio || null,
      website: parsed.data.website || null,
      vat_number: parsed.data.vat_number || null,
      is_public: parsed.data.is_public ?? true,
    })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/profile");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}
