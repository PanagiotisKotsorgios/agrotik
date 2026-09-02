import type { MetadataRoute } from "next";
import { getAppOrigin } from "@/lib/app-origin";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/dashboard/", "/api/"],
    },
    sitemap: `${getAppOrigin()}/sitemap.xml`,
    host: getAppOrigin(),
  };
}
