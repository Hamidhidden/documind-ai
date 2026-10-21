import type { MetadataRoute } from "next";
import { site } from "../lib/site";

/** Only the public pages are indexed; the app itself sits behind sign-in. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/about", "/contact", "/terms", "/privacy"],
      disallow: ["/api/", "/admin/", "/dashboard", "/documents", "/radar", "/collections", "/chat", "/billing", "/settings", "/reset-password"],
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
