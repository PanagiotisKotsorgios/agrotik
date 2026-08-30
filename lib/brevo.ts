import { createSupabaseService } from "@/lib/supabase/service";

export interface EmailTemplate {
  subject: string;
  heading: string;
  body_html: string;
}

export interface BrevoSettings {
  enabled: boolean;
  api_key: string;
  sender_email: string;
  sender_name: string;
  templates: Record<string, boolean>;
  welcome_template?: EmailTemplate;
  price_changed_template?: EmailTemplate;
  new_message_template?: EmailTemplate;
}

const DEFAULT: BrevoSettings = {
  enabled: false,
  api_key: "",
  sender_email: "info@agrotik.gr",
  sender_name: "AGROTIK",
  templates: {
    price_changed: true,
    new_better_price: true,
    new_message: true,
    welcome: true,
  },
};

export async function getBrevoSettings(): Promise<BrevoSettings> {
  const svc = createSupabaseService();
  const { data } = await svc.from("app_settings").select("value").eq("key", "brevo").maybeSingle();
  if (!data?.value) return DEFAULT;
  return { ...DEFAULT, ...(data.value as Partial<BrevoSettings>) };
}

export async function setBrevoSettings(patch: Partial<BrevoSettings>): Promise<BrevoSettings> {
  const svc = createSupabaseService();
  const current = await getBrevoSettings();
  const next = { ...current, ...patch, templates: { ...current.templates, ...(patch.templates ?? {}) } };
  await svc
    .from("app_settings")
    .upsert({ key: "brevo", value: next, updated_at: new Date().toISOString() });
  return next;
}

export interface BrevoEmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tag?: string;
}

/**
 * Send an email via Brevo transactional API.
 * No-op when Brevo is disabled or the template flag is false.
 */
export async function sendBrevoEmail(
  templateKey: keyof BrevoSettings["templates"],
  payload: BrevoEmailPayload,
): Promise<{ ok: boolean; error?: string; skipped?: boolean }> {
  const settings = await getBrevoSettings();
  if (!settings.enabled) return { ok: true, skipped: true };
  if (!settings.templates[templateKey]) return { ok: true, skipped: true };
  if (!settings.api_key) return { ok: false, error: "Brevo API key missing" };

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": settings.api_key,
      },
      body: JSON.stringify({
        sender: { email: settings.sender_email, name: settings.sender_name },
        to: payload.to,
        subject: payload.subject,
        htmlContent: payload.htmlContent,
        textContent: payload.textContent,
        tags: payload.tag ? [payload.tag, `agrotik:${templateKey}`] : [`agrotik:${templateKey}`],
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `Brevo ${res.status}: ${body.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? "unknown Brevo error" };
  }
}

export function renderEmailShell(title: string, bodyHtml: string) {
  return `<!doctype html>
<html><body style="margin:0;font-family:Inter,Arial,sans-serif;background:#F7F5EE;color:#141412;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E3DFD1;border-radius:12px;overflow:hidden">
        <tr><td style="padding:20px 24px;border-bottom:1px solid #E3DFD1;background:#fff">
          <div style="font-family:Georgia,serif;color:#1B4D2E;font-size:20px;font-weight:700">AGROTIK</div>
        </td></tr>
        <tr><td style="padding:24px">
          <h1 style="font-family:Georgia,serif;color:#1B4D2E;font-size:22px;margin:0 0 12px 0">${escapeHtml(title)}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 24px;border-top:1px solid #E3DFD1;color:#5A5A52;font-size:12px">
          Λαμβάνεις αυτό το email γιατί έχεις λογαριασμό στο AGROTIK.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}
