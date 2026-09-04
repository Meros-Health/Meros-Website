import type { MetadataRoute } from "next";
import { BUSINESS } from "@/lib/business";
import { BRAND } from "@/lib/design/colors";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BUSINESS.name,
    short_name: "MERŌS",
    description: BUSINESS.description,
    start_url: "/",
    display: "browser",
    background_color: BRAND.cream,
    theme_color: BRAND.cream,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
