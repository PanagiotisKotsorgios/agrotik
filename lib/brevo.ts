import { createSupabaseService } from "@/lib/supabase/service";

export interface EmailTemplate {
  subject: string;
  heading: string;
  body_html: string;
}

export type BrevoTemplateKey =
  | "price_changed"
  | "new_better_price"
  | "new_message"
  | "welcome"
  | "password_reset"
  | "contact"
  | "admin_notice";

export interface BrevoSettings {
  enabled: boolean;
  api_key: string;
  sender_email: string;
  sender_name: string;
  templates: Record<BrevoTemplateKey, boolean>;
  welcome_template?: EmailTemplate;
  price_changed_template?: EmailTemplate;
  new_message_template?: EmailTemplate;
  password_reset_template?: EmailTemplate;
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
    password_reset: true,
    contact: true,
    admin_notice: true,
  },
};

export async function getBrevoSettings(): Promise<BrevoSettings> {
  const svc = createSupabaseService();
  const { data, error } = await svc.from("app_settings").select("value").eq("key", "brevo").maybeSingle();
  if (error) {
    console.error("[brevo settings read]", error.message);
    return DEFAULT;
  }
  if (!data?.value) return DEFAULT;
  const stored = data.value as Partial<BrevoSettings>;
  const storedTemplates = stored.templates ?? {};
  const isLegacyConfig = !("password_reset" in storedTemplates);
  const templates = { ...DEFAULT.templates, ...storedTemplates };
  if (isLegacyConfig) {
    for (const key of Object.keys(templates) as BrevoTemplateKey[]) templates[key] = true;
  }
  return {
    ...DEFAULT,
    ...stored,
    templates,
  };
}

export async function setBrevoSettings(patch: Partial<BrevoSettings>): Promise<BrevoSettings> {
  const svc = createSupabaseService();
  const current = await getBrevoSettings();
  const next: BrevoSettings = {
    ...current,
    ...patch,
    api_key: patch.api_key !== undefined ? patch.api_key.trim() : current.api_key,
    sender_email: patch.sender_email !== undefined ? patch.sender_email.trim() : current.sender_email,
    sender_name: patch.sender_name !== undefined ? patch.sender_name.trim() : current.sender_name,
    templates: { ...current.templates, ...(patch.templates ?? {}) },
  };
  const { error } = await svc
    .from("app_settings")
    .upsert({ key: "brevo", value: next, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Αποτυχία αποθήκευσης ρυθμίσεων Brevo: ${error.message}`);
  return next;
}

export interface BrevoEmailPayload {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  textContent?: string;
  tag?: string;
}

export interface BrevoEmailResult {
  ok: boolean;
  error?: string;
  skipped?: boolean;
  skippedReason?: "disabled" | "template_disabled";
  messageId?: string;
}

/**
 * Send an email via Brevo transactional API.
 * No-op when Brevo is disabled or the template flag is false.
 */
export async function sendBrevoEmail(
  templateKey: BrevoTemplateKey | "test",
  payload: BrevoEmailPayload,
): Promise<BrevoEmailResult> {
  const settings = await getBrevoSettings();
  if (!settings.enabled) return { ok: true, skipped: true, skippedReason: "disabled" };
  if (templateKey !== "test" && !settings.templates[templateKey]) {
    return { ok: true, skipped: true, skippedReason: "template_disabled" };
  }
  if (!settings.api_key) return { ok: false, error: "Brevo API key missing" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/json",
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
    const body = (await res.json().catch(() => ({}))) as { messageId?: string };
    return { ok: true, messageId: body.messageId };
  } catch (e: any) {
    return {
      ok: false,
      error: e?.name === "AbortError" ? "Brevo request timeout" : (e?.message ?? "unknown Brevo error"),
    };
  } finally {
    clearTimeout(timeout);
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
