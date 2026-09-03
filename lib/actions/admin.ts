"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { setBrevoSettings, sendBrevoEmail, renderEmailShell, type BrevoSettings } from "@/lib/brevo";
import type { ActionResult } from "./auth";

const userIdSchema = z.string().uuid();
const roleSchema = z.enum([
  "farmer",
  "fisher",
  "farmer_fisher",
  "stockbreeder",
  "beekeeper",
  "farmer_stockbreeder",
  "farmer_beekeeper",
  "merchant",
  "factory",
  "agri_supplier",
  "admin",
]);
const notificationSchema = z.object({
  userId: z.string().uuid(),
  title: z.string().trim().min(2, "Ο τίτλος είναι πολύ μικρός").max(120),
  body: z.string().trim().min(1, "Γράψε το κείμενο της ειδοποίησης").max(2000),
});

async function requireAdmin() {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (data?.role !== "admin") return null;
  return user;
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  if (!userIdSchema.safeParse(userId).success) return { ok: false, error: "Μη έγκυρος χρήστης" };
  if (admin.id === userId && !active) {
    return { ok: false, error: "Δεν μπορείς να αναστείλεις τον δικό σου λογαριασμό" };
  }
  const svc = createSupabaseService();
  const { error } = await svc.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function setUserPublic(userId: string, isPublic: boolean): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  if (!userIdSchema.safeParse(userId).success) return { ok: false, error: "Μη έγκυρος χρήστης" };

  const svc = createSupabaseService();
  const { data, error } = await svc
    .from("profiles")
    .update({ is_public: isPublic })
    .eq("id", userId)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Ο χρήστης δεν βρέθηκε" };

  revalidatePath("/");
  revalidatePath("/admin/users");
  revalidatePath("/search/buyers");
  revalidatePath("/search/producers");
  revalidatePath(`/profile/${userId}`);
  return { ok: true };
}

export async function promoteToAdmin(userId: string): Promise<ActionResult> {
  return setUserRole(userId, "admin");
}

export async function setUserRole(userId: string, role: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const parsedUserId = userIdSchema.safeParse(userId);
  const parsedRole = roleSchema.safeParse(role);
  if (!parsedUserId.success || !parsedRole.success) return { ok: false, error: "Μη έγκυρα στοιχεία" };
  if (admin.id === userId && role !== "admin") {
    return { ok: false, error: "Δεν μπορείς να αφαιρέσεις τον δικό σου ρόλο διαχειριστή" };
  }
  const svc = createSupabaseService();
  const { error } = await svc.from("profiles").update({ role: parsedRole.data }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function sendAdminNotification(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const parsed = notificationSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  }

  const svc = createSupabaseService();
  const { data: target, error: targetError } = await svc
    .from("profiles")
    .select("id")
    .eq("id", parsed.data.userId)
    .maybeSingle();
  if (targetError || !target) return { ok: false, error: "Ο χρήστης δεν βρέθηκε" };

  const { error } = await svc.from("notifications").insert({
    user_id: parsed.data.userId,
    kind: "admin_notice",
    payload: {
      title: parsed.data.title,
      body: parsed.data.body,
      sent_by: admin.id,
    },
  });
  if (error) return { ok: false, error: error.message };

  const { data: recipient } = await svc.auth.admin.getUserById(parsed.data.userId);
  if (recipient?.user?.email) {
    const emailResult = await sendBrevoEmail("admin_notice", {
      to: [{ email: recipient.user.email }],
      subject: `AGROTIK · ${parsed.data.title}`,
      htmlContent: renderEmailShell(
        parsed.data.title,
        `<p>${escapeHtml(parsed.data.body).replace(/\n/g, "<br/>")}</p>`,
      ),
      tag: "admin_notice",
    });
    if (!emailResult.ok) console.error("[admin notice email]", emailResult.error);
  }

  revalidatePath("/dashboard/notifications");
  return { ok: true };
}

export async function deleteUserPermanently(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  if (!userIdSchema.safeParse(userId).success) return { ok: false, error: "Μη έγκυρος χρήστης" };
  if (admin.id === userId) {
    return { ok: false, error: "Δεν μπορείς να διαγράψεις τον δικό σου λογαριασμό" };
  }

  const svc = createSupabaseService();
  const { data: target, error: targetError } = await svc.auth.admin.getUserById(userId);
  if (targetError || !target.user) return { ok: false, error: "Ο χρήστης δεν βρέθηκε" };

  // false means a hard delete in Supabase Auth. Database cascades remove the
  // profile and all dependent platform records in the same operation.
  const { error } = await svc.auth.admin.deleteUser(userId, false);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/users");
  return { ok: true };
}

export async function approveProduct(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const svc = createSupabaseService();
  const { error } = await svc.from("products").update({ status: "active" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function rejectProduct(id: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const svc = createSupabaseService();
  const { error } = await svc.from("products").update({ status: "rejected" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function saveBrevoSettings(input: Partial<BrevoSettings>): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  try {
    await setBrevoSettings(input);
    revalidatePath("/admin/settings");
    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message ?? "Αποτυχία αποθήκευσης ρυθμίσεων Brevo" };
  }
}

export async function sendBrevoTest(to: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const res = await sendBrevoEmail("test", {
    to: [{ email: to }],
    subject: "AGROTIK · Δοκιμαστικό email",
    htmlContent: renderEmailShell(
      "Το Brevo λειτουργεί",
      "<p>Αν το βλέπεις, το κλειδί και ο sender είναι σωστά ρυθμισμένα.</p>",
    ),
    tag: "test",
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Αποτυχία αποστολής" };
  if (res.skippedReason === "disabled") return { ok: false, error: "Το Brevo είναι απενεργοποιημένο" };
  return { ok: true };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) =>
    character === "&"
      ? "&amp;"
      : character === "<"
        ? "&lt;"
        : character === ">"
          ? "&gt;"
          : character === '"'
            ? "&quot;"
            : "&#39;",
  );
}

export async function exportCSV(kind: "users" | "listings"): Promise<{ ok: true; csv: string } | { ok: false; error: string }> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const svc = createSupabaseService();

  if (kind === "users") {
    const { data } = await svc
      .from("profiles")
      .select("id, role, display_name, phone, region_code, municipality, is_public, is_active, created_at")
      .order("created_at", { ascending: false });
    return { ok: true, csv: toCSV((data as any[]) ?? []) };
  }

  const [{ data: prices }, { data: prods }] = await Promise.all([
    svc.from("price_listings").select("id, owner_id, product_id, region_code, is_active, updated_at").limit(10000),
    svc.from("production_listings").select("id, owner_id, product_id, region_code, quantity, unit, is_active, updated_at").limit(10000),
  ]);
  const combined = [
    ...(prices ?? []).map((r: any) => ({ kind: "price", ...r })),
    ...(prods ?? []).map((r: any) => ({ kind: "production", ...r })),
  ];
  return { ok: true, csv: toCSV(combined) };
}

function toCSV(rows: any[]): string {
  if (rows.length === 0) return "";
  const cols = Array.from(rows.reduce((s: Set<string>, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: any) => {
    const s = v === null || v === undefined ? "" : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}
