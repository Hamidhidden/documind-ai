import type { MetadataRoute } from "next";
import { site } from "../lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const pages: [string, number][] = [["", 1], ["/register", 0.8], ["/about", 0.5], ["/contact", 0.5], ["/terms", 0.3], ["/privacy", 0.3]];
  return pages.map(([path, priority]) => ({ url: `${site.url}${path}`, changeFrequency: "monthly", priority }));
}
