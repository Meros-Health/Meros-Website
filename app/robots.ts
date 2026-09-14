import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// The REX site served a Yoast-generated robots.txt that allowed everything and
// pointed at sitemap_index.xml. This keeps the same open posture and points at
// the sitemap this app generates, so the cutover does not look like the site
// suddenly started blocking crawlers.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Transactional and per-line routes. Nothing to index, and /cart/edit
      // paths are keyed by a cart line id that only exists in one browser.
      // /source-menu is the staff reference for the whole menu: reachable by
      // its URL, linked from nowhere, and kept out of the index on purpose.
      disallow: ["/checkout", "/cart/", "/source-menu"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
