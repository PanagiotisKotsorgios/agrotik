import type { MetadataRoute } from "next";
import { createSupabaseService } from "@/lib/supabase/service";
import { getAppOrigin } from "@/lib/app-origin";

export const revalidate = 3600;
const MAX_ROWS = 5000;

/**
 * Sitemap includes the marketing pages plus every public profile
 * and every active price listing so search engines can discover
 * the single-page URLs directly. Runs server-side with the service
 * role so it can bypass RLS reliably.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = getAppOrigin();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${origin}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${origin}/search/buyers`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/search/producers`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/search/suppliers`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${origin}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${origin}/legal/imprint`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const svc = createSupabaseService();
    const [{ data: profiles }, { data: listings }] = await Promise.all([
      svc
        .from("profiles")
        .select("id, updated_at")
        .eq("is_active", true)
        .eq("is_public", true)
        .is("deleted_at", null)
        .neq("role", "admin")
        .order("updated_at", { ascending: false })
        .limit(MAX_ROWS),
      svc
        .from("price_listings")
        .select("id, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(MAX_ROWS),
    ]);

    const profileEntries: MetadataRoute.Sitemap = ((profiles as { id: string; updated_at: string }[]) ?? []).map(
      (row) => ({
        url: `${origin}/profile/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.6,
      }),
    );

    const listingEntries: MetadataRoute.Sitemap = ((listings as { id: string; updated_at: string }[]) ?? []).map(
      (row) => ({
        url: `${origin}/listing/${row.id}`,
        lastModified: row.updated_at ? new Date(row.updated_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      }),
    );

    return [...staticEntries, ...profileEntries, ...listingEntries];
  } catch (error) {
    console.error("[sitemap] falling back to static entries:", error);
    return staticEntries;
  }
}
