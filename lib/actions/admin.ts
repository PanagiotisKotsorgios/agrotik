"use server";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import { createSupabaseService } from "@/lib/supabase/service";
import { setBrevoSettings, sendBrevoEmail, renderEmailShell, type BrevoSettings } from "@/lib/brevo";
import type { ActionResult } from "./auth";

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
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const svc = createSupabaseService();
  const { error } = await svc.from("profiles").update({ is_active: active }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function promoteToAdmin(userId: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const svc = createSupabaseService();
  const { error } = await svc.from("profiles").update({ role: "admin" }).eq("id", userId);
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
  await setBrevoSettings(input);
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function sendBrevoTest(to: string): Promise<ActionResult> {
  if (!(await requireAdmin())) return { ok: false, error: "Δεν έχεις δικαίωμα" };
  const res = await sendBrevoEmail("welcome", {
    to: [{ email: to }],
    subject: "AGROTIK · Δοκιμαστικό email",
    htmlContent: renderEmailShell(
      "Το Brevo λειτουργεί",
      "<p>Αν το βλέπεις, το κλειδί και ο sender είναι σωστά ρυθμισμένα.</p>",
    ),
    tag: "test",
  });
  if (!res.ok) return { ok: false, error: res.error ?? "Αποτυχία αποστολής" };
  if (res.skipped) return { ok: false, error: "Το Brevo είναι απενεργοποιημένο ή το template κλειστό" };
  return { ok: true };
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
