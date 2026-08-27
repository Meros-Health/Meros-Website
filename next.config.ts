import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// The agency site that held merosyogurt.com until now had six indexed URLs,
// taken from its sitemap before it was archived. Every one of them has an
// equivalent here, so they redirect permanently rather than 404 and drop the
// ranking the domain already has. These live in the app rather than in
// Cloudflare Redirect Rules so they are reviewable, version controlled, and
// deploy with the code. They are inert until the domain points at this Worker.
const LEGACY_PATHS: Array<[from: string, to: string]> = [
  ["/about-us", "/#about"],
  ["/build-a-bowl", "/build"],
  ["/our-menu", "/order"],
  ["/privacy-policy", "/privacy"],
  ["/contact", "/#footer"],
];

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp", "image/avif"],
  },
  async redirects() {
    // WordPress served these with a trailing slash. Next normalises the
    // trailing slash before matching, so one entry covers both forms.
    return LEGACY_PATHS.map(([source, destination]) => ({
      source,
      destination,
      permanent: true,
    }));
  },
};

export default nextConfig;

// Enables Cloudflare bindings (env, caches) during `next dev`.
initOpenNextCloudflareForDev();
