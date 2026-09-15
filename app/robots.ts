import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

/**
 * Le site n'en avait aucun : /robots.txt repondait 404, donc rien ne declarait
 * le sitemap aux moteurs. L'admin Payload, les routes techniques, le Hub et
 * ses pages d'abonnement sont exclus, ils n'ont rien a faire dans un index.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/hub", "/abonnement"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
