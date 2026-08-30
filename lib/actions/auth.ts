"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import type { UserRole } from "@/lib/db/types";

const roleEnum = z.enum(["farmer", "merchant", "factory"]);

const signupSchema = z.object({
  email: z.string().email("Μη έγκυρο email"),
  password: z.string().min(6, "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"),
  role: roleEnum,
  display_name: z.string().min(2, "Απαιτείται όνομα"),
  phone: z.string().min(6, "Απαιτείται τηλέφωνο"),
  region_code: z.string().min(1, "Απαιτείται περιοχή"),
  bio: z.string().optional(),
});

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function signup(formData: FormData): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };
  }
  const data = parsed.data;

  const supabase = await createSupabaseServer();
  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });
  if (signUpError || !authData.user) {
    return { ok: false, error: signUpError?.message ?? "Αποτυχία εγγραφής" };
  }

  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const finalRole: UserRole =
    seedAdminEmail && data.email.toLowerCase() === seedAdminEmail
      ? "admin"
      : data.role;

  const service = createSupabaseService();
  const { error: profileError } = await service.from("profiles").insert({
    id: authData.user.id,
    role: finalRole,
    display_name: data.display_name,
    phone: data.phone,
    region_code: data.region_code,
    bio: data.bio || null,
    is_public: true,
    is_active: true,
  });

  if (profileError) {
    return { ok: false, error: `Αποτυχία δημιουργίας προφίλ: ${profileError.message}` };
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function login(formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "Συμπλήρωσε email και κωδικό" };

  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: "Λάθος στοιχεία σύνδεσης" };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function logout() {
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
