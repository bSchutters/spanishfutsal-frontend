import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Le site n'en avait aucun : /robots.txt repondait 404, donc rien ne declarait
 * le sitemap aux moteurs. L'admin Payload et les routes techniques sont
 * exclues, elles n'ont rien a faire dans un index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
