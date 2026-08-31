"use server";

import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Συμπλήρωσε τον τρέχοντα κωδικό"),
    new_password: z.string().min(6, "Ο νέος κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"),
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
