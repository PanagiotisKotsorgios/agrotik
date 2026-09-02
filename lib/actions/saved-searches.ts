"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServer } from "@/lib/supabase/server";
import type { ActionResult } from "./auth";

const scopeSchema = z.enum(["producers", "buyers"]);
const filtersSchema = z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())]));

const saveSchema = z.object({
  scope: scopeSchema,
  label: z.string().trim().min(1, "Δώσε ένα όνομα").max(120),
  filters: filtersSchema,
  alerts_enabled: z.boolean().default(false),
});

export async function saveSearch(input: unknown): Promise<ActionResult> {
  const parsed = saveSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Μη έγκυρα στοιχεία" };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  const { error } = await supabase.from("saved_searches").insert({
    user_id: user.id,
    scope: parsed.data.scope,
    label: parsed.data.label,
    filters: parsed.data.filters,
    alerts_enabled: parsed.data.alerts_enabled,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/saved-searches");
  return { ok: true };
}

export async function deleteSavedSearch(id: string): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη αναζήτηση" };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  const { error } = await supabase.from("saved_searches").delete().eq("id", parsedId.data).eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/saved-searches");
  return { ok: true };
}

export async function toggleSavedSearchAlerts(id: string, enabled: boolean): Promise<ActionResult> {
  const parsedId = z.string().uuid().safeParse(id);
  if (!parsedId.success) return { ok: false, error: "Μη έγκυρη αναζήτηση" };
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Απαιτείται σύνδεση" };
  const { error } = await supabase
    .from("saved_searches")
    .update({ alerts_enabled: enabled })
    .eq("id", parsedId.data)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard/saved-searches");
  return { ok: true };
}
