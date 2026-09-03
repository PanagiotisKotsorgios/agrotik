"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendBrevoEmail, renderEmailShell } from "@/lib/brevo";
import { getAppOrigin } from "@/lib/app-origin";
import type { ActionResult } from "./auth";

const sendSchema = z.object({
  recipient_id: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});

export async function sendMessage(input: unknown): Promise<ActionResult> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα δεδομένα" };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  if (user.id === parsed.data.recipient_id) return { ok: false, error: "Δεν μπορείς να στείλεις στον εαυτό σου" };

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    recipient_id: parsed.data.recipient_id,
    body: parsed.data.body,
  });
  if (error) return { ok: false, error: error.message };

  // Fire off email (best-effort) via service role — look up recipient email
  const svc = createSupabaseService();
  const [{ data: sender }, { data: recipientProfile }, { data: recipient }] = await Promise.all([
    svc.from("profiles").select("display_name").eq("id", user.id).single(),
    svc.from("profiles").select("role").eq("id", parsed.data.recipient_id).single(),
    svc.auth.admin.getUserById(parsed.data.recipient_id),
  ]);
  const recEmail = recipient?.user?.email;
  if (recEmail) {
    const inboxPath = recipientProfile?.role === "admin" ? "/admin/messages" : "/dashboard/messages";
    await sendBrevoEmail("new_message", {
      to: [{ email: recEmail }],
      subject: `Νέο μήνυμα από ${sender?.display_name ?? "χρήστη"} στο AGROTIK`,
      htmlContent: renderEmailShell(
        `Νέο μήνυμα από ${sender?.display_name ?? "χρήστη"}`,
        `<p>${escapeText(parsed.data.body).slice(0, 400)}</p>
         <p><a href="${getAppOrigin()}${inboxPath}/${user.id}" style="color:#1B4D2E">Δες το μήνυμα</a></p>`,
      ),
      tag: "new_message",
    });
  }

  revalidatePath(`/dashboard/messages/${parsed.data.recipient_id}`);
  revalidatePath("/dashboard/messages");
  return { ok: true };
}

export async function markThreadRead(withUserId: string): Promise<ActionResult> {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", user.id)
    .eq("sender_id", withUserId)
    .is("read_at", null);
  revalidatePath(`/dashboard/messages/${withUserId}`);
  return { ok: true };
}

function escapeText(s: string) {
  return s.replace(/[&<>]/g, (c) => (c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;"));
}
