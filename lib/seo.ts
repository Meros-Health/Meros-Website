import type { Metadata } from "next";

/**
 * Per-route metadata.
 *
 * Next merges metadata down the tree field by field, but it *replaces* an
 * object field rather than merging into it. A route that sets `openGraph` to
 * add a url therefore drops the image, site name and type it was inheriting,
 * and the page silently loses its link preview. This builds the whole object
 * every time so that cannot happen.
 *
 * Every route needs its own canonical for the opposite reason: a canonical set
 * once in the root layout is inherited by all of them, which tells crawlers
 * each route's canonical version is the home page.
 */

export const OG_IMAGE = {
  // Placeholder until a purpose-cropped 1200x630 exists: this is the hero shot
  // at 3:2, so social platforms crop the top and bottom.
  url: "/images-web/Hero/Gallery-8-hero-web.jpg",
  width: 2880,
  height: 1922,
  alt: "A Meros yogurt bowl",
} as const;

export const SITE_NAME = "MERŌS House of Yogurt";

export function pageMetadata(opts: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const { title, description, path } = opts;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_CA",
      title,
      description,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}
