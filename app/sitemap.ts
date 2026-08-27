import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Only the pages worth indexing. /checkout is transactional and /cart/edit is
// keyed by a cart line id that exists in exactly one browser, so neither
// belongs here; robots.ts disallows both.
const ROUTES = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/order", changeFrequency: "weekly", priority: 0.9 },
  { path: "/build", changeFrequency: "weekly", priority: 0.9 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.2 },
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}
