"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendBrevoEmail, renderEmailShell, getBrevoSettings } from "@/lib/brevo";
import type { UserRole } from "@/lib/db/types";

// Signup only accepts solo roles. Combined roles are opt-in upgrades
// applied later from the dashboard profile editor, so the register
// screen stays a single-card decision.
const roleEnum = z.enum([
  "farmer",
  "fisher",
  "stockbreeder",
  "beekeeper",
  "merchant",
  "factory",
  "agri_supplier",
]);

const signupSchema = z.object({
  email: z.string().email("Μη έγκυρο email"),
  password: z.string().min(6, "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"),
  role: roleEnum,
  display_name: z.string().min(2, "Απαιτείται όνομα"),
  phone: z.string().min(6, "Απαιτείται τηλέφωνο"),
  region_code: z.string().min(1, "Απαιτείται Νομός / Π.Ε."),
  municipality: z.string().min(2, "Απαιτείται συγκεκριμένη περιοχή (Δήμος / πόλη / χωριό)"),
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
    municipality: data.municipality,
    bio: data.bio || null,
    is_public: true,
    is_active: true,
  });

  if (profileError) {
    return { ok: false, error: `Αποτυχία δημιουργίας προφίλ: ${profileError.message}` };
  }

  // Best-effort welcome email (skipped silently if Brevo is off / template disabled)
  try {
    const settings = await getBrevoSettings();
    const tpl = (settings as any).welcome_template ?? {};
    const subject = tpl.subject || "Καλωσόρισες στο AGROTIK";
    const heading = tpl.heading || `Γεια σου ${data.display_name},`;
    const bodyHtml = tpl.body_html || defaultWelcomeBody(data.display_name);
    await sendBrevoEmail("welcome", {
      to: [{ email: data.email, name: data.display_name }],
      subject,
      htmlContent: renderEmailShell(heading, bodyHtml),
      tag: "welcome",
    });
  } catch (e) {
    console.error("[welcome email]", e);
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

function defaultWelcomeBody(name: string): string {
  return `
    <p>Καλωσόρισες στο <strong>AGROTIK</strong>, τη νέα ελληνική αγορά που συνδέει
    αγρότες και αλιείς με εμπόρους και εργοστάσια — απευθείας, χωρίς μεσάζοντες.</p>
    <p>Ο λογαριασμός σου είναι έτοιμος. Το επόμενο βήμα είναι να συμπληρώσεις
    τα στοιχεία του προφίλ σου και να καταχωρήσεις την πρώτη σου καταχώρηση.</p>
    <p style="margin: 24px 0">
      <a href="http://agrotik.gr/login" style="display:inline-block;background:#1B4D2E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Σύνδεση στον λογαριασμό μου
      </a>
    </p>
    <p>Ελπίζουμε το AGROTIK να γίνει το εργαλείο που θα σε βοηθήσει να πετύχεις
    καλύτερες τιμές και σχέσεις χωρίς προμήθειες.</p>
    <p>Για οποιαδήποτε ερώτηση:<br/>
    ☎ <a href="tel:2631028971">2631028971</a><br/>
    ✉ <a href="mailto:info@agrotik.gr">info@agrotik.gr</a></p>
    <p style="margin-top: 24px; color: #5A5A52">— Η ομάδα του AGROTIK</p>
  `;
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
