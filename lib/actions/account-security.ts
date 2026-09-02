"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { ActionResult } from "./auth";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Συμπλήρωσε τον τρέχοντα κωδικό"),
    new_password: z.string().min(8, "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες").max(128),
    confirm_password: z.string().min(1, "Επιβεβαίωσε τον νέο κωδικό"),
  })
  .refine((values) => values.new_password === values.confirm_password, {
    message: "Οι νέοι κωδικοί δεν ταιριάζουν",
    path: ["confirm_password"],
  })
  .refine((values) => values.current_password !== values.new_password, {
    message: "Ο νέος κωδικός πρέπει να είναι διαφορετικός από τον τρέχοντα",
    path: ["new_password"],
  });

export async function changePassword(formData: FormData): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current_password,
  });
  if (verificationError) {
    return { ok: false, error: "Ο τρέχων κωδικός δεν είναι σωστός" };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: parsed.data.new_password,
  });
  if (updateError) {
    console.error("[change password]", updateError.message);
    return { ok: false, error: "Η αλλαγή κωδικού απέτυχε. Δοκίμασε ξανά." };
  }

  return { ok: true };
}

const deleteAccountSchema = z.object({
  password: z.string().min(1, "Συμπλήρωσε τον κωδικό σου"),
  confirmation: z.literal("ΔΙΑΓΡΑΦΗ", {
    errorMap: () => ({ message: "Πληκτρολόγησε ΔΙΑΓΡΑΦΗ για επιβεβαίωση" }),
  }),
});

export async function deleteOwnAccount(formData: FormData): Promise<ActionResult> {
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: "Απαιτείται σύνδεση" };

  const { error: verificationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (verificationError) return { ok: false, error: "Ο κωδικός δεν είναι σωστός" };

  const service = createSupabaseService();
  const deletedAt = new Date().toISOString();
  const { error: profileError } = await service
    .from("profiles")
    .update({
      display_name: "Διαγραμμένος χρήστης",
      phone: "-",
      municipality: null,
      address_line: null,
      bio: null,
      website: null,
      vat_number: null,
      avatar_path: null,
      avatar_url: null,
      cover_url: null,
      gallery: [],
      extras: {},
      year_founded: null,
      employees_range: null,
      certifications: null,
      specialties: null,
      opening_hours: null,
      is_public: false,
      is_active: false,
      deleted_at: deletedAt,
    })
    .eq("id", user.id);
  if (profileError) return { ok: false, error: "Η διαγραφή δεν ολοκληρώθηκε. Επικοινώνησε με την υποστήριξη." };

  await Promise.all([
    service.from("price_listings").update({ is_active: false }).eq("owner_id", user.id),
    service.from("production_listings").update({ is_active: false }).eq("owner_id", user.id),
    service.from("favorites").delete().eq("user_id", user.id),
    service.from("notifications").delete().eq("user_id", user.id),
  ]);

  // Soft deletion keeps referential integrity for counterparties' purchase
  // histories while Supabase removes the account's login identity.
  const { error: authError } = await service.auth.admin.deleteUser(user.id, true);
  if (authError) console.error("[account soft delete]", authError.message);
  await supabase.auth.signOut();
  return { ok: true };
}
