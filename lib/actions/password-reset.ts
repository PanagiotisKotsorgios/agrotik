"use server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendBrevoEmail, renderEmailShell, getBrevoSettings } from "@/lib/brevo";
import type { ActionResult } from "./auth";

const TOKEN_TTL_MIN = 60;

const requestSchema = z.object({
  email: z.string().email("Μη έγκυρο email"),
});

const applySchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(6, "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες"),
});

/**
 * Always returns ok:true (do not reveal whether the email exists). Silently
 * skips the email if no user matches.
 */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρο email" };

  const svc = createSupabaseService();
  // Find user by email (Supabase Auth admin listUsers doesn't filter on email directly)
  const { data } = await svc.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data?.users?.find((u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase());
  if (!user) return { ok: true }; // silent success

  // Invalidate previous unused tokens for this user
  await svc
    .from("password_reset_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("used_at", null);

  const expires = new Date(Date.now() + TOKEN_TTL_MIN * 60_000).toISOString();
  const { data: inserted, error } = await svc
    .from("password_reset_tokens")
    .insert({ user_id: user.id, email: parsed.data.email, expires_at: expires })
    .select("token")
    .single();
  if (error || !inserted) return { ok: true }; // silent

  const settings = await getBrevoSettings();
  const link = `${appOrigin()}/reset-password?token=${inserted.token}`;
  const tpl = (settings as any).password_reset_template ?? {};
  const subject = tpl.subject || "AGROTIK · Επαναφορά κωδικού";
  const heading = tpl.heading || "Επαναφορά κωδικού";
  const bodyHtml =
    (tpl.body_html as string | undefined)?.replace("{{link}}", link) ||
    defaultBody(link);

  await sendBrevoEmail("welcome", {
    to: [{ email: parsed.data.email }],
    subject,
    htmlContent: renderEmailShell(heading, bodyHtml),
    tag: "password_reset",
  });
  return { ok: true };
}

export async function applyPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = applySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const svc = createSupabaseService();
  const { data: row } = await svc
    .from("password_reset_tokens")
    .select("*")
    .eq("token", parsed.data.token)
    .maybeSingle();
  if (!row) return { ok: false, error: "Ο σύνδεσμος δεν είναι έγκυρος" };
  if (row.used_at) return { ok: false, error: "Ο σύνδεσμος έχει ήδη χρησιμοποιηθεί" };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Ο σύνδεσμος έχει λήξει. Ζήτησε καινούριο." };
  }

  const { error: updErr } = await svc.auth.admin.updateUserById(row.user_id, {
    password: parsed.data.password,
  });
  if (updErr) return { ok: false, error: "Αποτυχία ενημέρωσης κωδικού" };

  await svc.from("password_reset_tokens").update({ used_at: new Date().toISOString() }).eq("token", parsed.data.token);
  return { ok: true };
}

function appOrigin(): string {
  return process.env.APP_ORIGIN || "http://localhost:3000";
}

function defaultBody(link: string): string {
  return `
    <p>Έλαβες αυτό το email γιατί ζητήθηκε επαναφορά του κωδικού για τον λογαριασμό σου στο AGROTIK.</p>
    <p>Πάτησε το παρακάτω κουμπί για να ορίσεις καινούριο κωδικό. Ο σύνδεσμος είναι έγκυρος για ${TOKEN_TTL_MIN} λεπτά.</p>
    <p style="margin: 24px 0">
      <a href="${link}" style="display:inline-block;background:#1B4D2E;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Ορισμός νέου κωδικού
      </a>
    </p>
    <p style="font-size:12px;color:#5A5A52">Αν δεν ζήτησες εσύ την επαναφορά, αγνόησε το email. Δεν θα γίνει καμία αλλαγή.</p>
  `;
}
