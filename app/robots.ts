import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = getAppOrigin();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Authenticated / operator surfaces should not appear in
        // search results. /login, /signup, /reset-password have their
        // own noindex when the user is signed in; keeping them out of
        // robots.txt would only hide fresh visits, so they stay
        // crawlable at the marketing level.
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
        ],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
