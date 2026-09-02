import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-origin";

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = getAppOrigin();
  const paths = [
    "",
    "/search/buyers",
    "/search/producers",
    "/how-it-works",
    "/pricing",
    "/faq",
    "/contact",
    "/legal/privacy",
    "/legal/terms",
    "/legal/cookies",
    "/legal/imprint",
  ];
  return paths.map((path) => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency: path.startsWith("/search") ? "daily" : "monthly",
    priority: path === "" ? 1 : path.startsWith("/search") ? 0.9 : 0.6,
  }));
}
