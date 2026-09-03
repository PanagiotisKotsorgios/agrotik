"use server";
import { z } from "zod";
import { sendBrevoEmail, renderEmailShell } from "@/lib/brevo";
import type { ActionResult } from "./auth";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Απαιτείται όνομα"),
  email: z.string().email("Μη έγκυρο email"),
  phone: z.string().optional(),
  subject: z.string().trim().min(2, "Απαιτείται θέμα"),
  body: z.string().trim().min(10, "Το μήνυμα είναι πολύ σύντομο").max(4000),
});

export async function sendContactMessage(formData: FormData): Promise<ActionResult> {
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

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
