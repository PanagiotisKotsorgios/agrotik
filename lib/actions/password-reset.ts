"use server";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendBrevoEmail, renderEmailShell, getBrevoSettings } from "@/lib/brevo";
import { getAppOrigin } from "@/lib/app-origin";
import type { ActionResult } from "./auth";
import { consumeRateLimit } from "@/lib/rate-limit";

const TOKEN_TTL_MIN = 60;

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Μη έγκυρο email").max(254),
});

const applySchema = z.object({
  token: z.string().uuid(),
  password: z.string().min(8, "Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες").max(128),
});

/**
 * Always returns ok:true (do not reveal whether the email exists). Silently
 * skips the email if no user matches.
 */
export async function requestPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = requestSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρο email" };

  if (!(await consumeRateLimit("password-reset-request", parsed.data.email, 3, 3600))) {
    // Keep the response indistinguishable from a successful request.
    return { ok: true };
  }

  const svc = createSupabaseService();
  // Find the user without silently excluding accounts beyond the first page.
  let user: Awaited<ReturnType<typeof svc.auth.admin.listUsers>>["data"]["users"][number] | undefined;
  for (let page = 1; page <= 100 && !user; page += 1) {
    const { data, error: usersError } = await svc.auth.admin.listUsers({ page, perPage: 1000 });
    if (usersError) {
      console.error("[password reset user lookup]", usersError.message);
      return { ok: true };
    }
    user = data?.users?.find((candidate) => candidate.email?.toLowerCase() === parsed.data.email);
    if (!data || data.users.length < 1000) break;
  }
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
  if (error || !inserted) {
    console.error("[password reset token]", error?.message ?? "Token was not returned");
    return { ok: true };
  }

  const settings = await getBrevoSettings();
  const link = `${getAppOrigin()}/reset-password?token=${inserted.token}`;
  const tpl = (settings as any).password_reset_template ?? {};
  const subject = tpl.subject || "AGROTIK · Επαναφορά κωδικού";
  const heading = tpl.heading || "Επαναφορά κωδικού";
  const bodyHtml =
    (tpl.body_html as string | undefined)?.replaceAll("{{link}}", link) ||
    defaultBody(link);

  const emailResult = await sendBrevoEmail("password_reset", {
    to: [{ email: parsed.data.email }],
    subject,
    htmlContent: renderEmailShell(heading, bodyHtml),
    tag: "password_reset",
  });
  if (!emailResult.ok) console.error("[password reset email]", emailResult.error);
  if (emailResult.skipped) {
    console.warn("[password reset email] skipped:", emailResult.skippedReason);
  }
  return { ok: true };
}

export async function applyPasswordReset(formData: FormData): Promise<ActionResult> {
  const parsed = applySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  if (!(await consumeRateLimit("password-reset-apply", parsed.data.token, 10, 3600))) {
    return { ok: false, error: "Έγιναν πολλές προσπάθειες. Ζήτησε νέο σύνδεσμο." };
  }

  const svc = createSupabaseService();
  const claimedAt = new Date().toISOString();
  const { data: row } = await svc
    .from("password_reset_tokens")
    .update({ used_at: claimedAt })
    .eq("token", parsed.data.token)
    .is("used_at", null)
    .gt("expires_at", claimedAt)
    .select("*")
    .maybeSingle();
  if (!row) return { ok: false, error: "Ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει" };

  const { error: updErr } = await svc.auth.admin.updateUserById(row.user_id, {
    password: parsed.data.password,
  });
  if (updErr) {
    await svc
      .from("password_reset_tokens")
      .update({ used_at: null })
      .eq("token", parsed.data.token)
      .eq("used_at", claimedAt);
    return { ok: false, error: "Αποτυχία ενημέρωσης κωδικού" };
  }
  return { ok: true };
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
