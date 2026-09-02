"use server";
import { z } from "zod";
import { sendBrevoEmail, renderEmailShell } from "@/lib/brevo";
import type { ActionResult } from "./auth";
import { headers } from "next/headers";
import { consumeRateLimit } from "@/lib/rate-limit";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Απαιτείται όνομα").max(120),
  email: z.string().trim().toLowerCase().email("Μη έγκυρο email").max(254),
  phone: z.string().trim().max(40).optional(),
  subject: z.string().trim().min(2, "Απαιτείται θέμα").max(160),
  body: z.string().trim().min(10, "Το μήνυμα είναι πολύ σύντομο").max(4000),
  company_fax: z.string().max(0).optional(),
});

export async function sendContactMessage(formData: FormData): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    // Filled honeypots receive a neutral success response.
    if (formData.get("company_fax")) return { ok: true };
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };
  }

  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
  if (!(await consumeRateLimit("contact", `${ip}:${parsed.data.email}`, 5, 3600))) {
    return { ok: false, error: "Έχουν σταλεί πολλά μηνύματα. Δοκίμασε ξανά αργότερα." };
  }

  const { name, email, phone, subject, body } = parsed.data;
  const safe = (s: string) => s.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );

  const res = await sendBrevoEmail("contact", {
    to: [{ email: "info@agrotik.gr" }],
    subject: `AGROTIK · Contact: ${subject}`,
    htmlContent: renderEmailShell(
      `Νέο μήνυμα από τη φόρμα επικοινωνίας`,
      `<p><strong>Από:</strong> ${safe(name)} &lt;${safe(email)}&gt;</p>
       ${phone ? `<p><strong>Τηλέφωνο:</strong> ${safe(phone)}</p>` : ""}
       <p><strong>Θέμα:</strong> ${safe(subject)}</p>
       <hr style="border:none;border-top:1px solid #E3DFD1;margin:16px 0" />
       <p>${safe(body).replace(/\n/g, "<br/>")}</p>`,
    ),
    tag: "contact",
  });

  if (!res.ok) return { ok: false, error: res.error ?? "Αποτυχία αποστολής" };
  if (res.skipped) {
    // Brevo not configured — still surface a helpful message
    return {
      ok: false,
      error: "Η αποστολή email δεν είναι ενεργή. Επικοινώνησε στο 2631028971 ή info@agrotik.gr",
    };
  }
  return { ok: true };
}
