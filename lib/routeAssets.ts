import {
  HERO_RIGHT_IMAGE_SRC,
  HERO_LOGO_DARK_SRC,
  HERO_LOGO_LIGHT_SRC,
} from "@/lib/heroAssets";

// Above-the-fold assets the transition cover waits on before revealing a
// route. Routes without an entry get the timed hold only. preloadImage
// resolves on error too, so a missing file can never stall navigation.
export const ROUTE_CRITICAL_ASSETS: Partial<Record<string, string[]>> = {
  "/": [HERO_RIGHT_IMAGE_SRC, HERO_LOGO_DARK_SRC, HERO_LOGO_LIGHT_SRC],
  "/order": ["/images-web/Bowls/Moment-1.jpg", "/images-web/Bowls/Silk-1.jpg"],
};
