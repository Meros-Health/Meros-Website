// The landing hero's above-the-fold assets. HeroSection renders them as
// `priority` images marked CRITICAL_IMAGE (lib/criticalImages.ts), which is
// what the Preloader and the page transition wait on.

// Panel 2, the band on the first screen: the flat-lay, cropped by
// `object-fit: cover` against a row half the viewport's height. The
// source is never scaled on one axis to fit; the row shows less of the frame
// on a short screen, not a squeezed version of it.
//
// The 2880px Hero/ copy, not the 1024px Gallery/ one. The band is full-width,
// so on a 1440px viewport at DPR 2 the browser asks for a 1920px variant, and
// the gallery source cannot render one without upscaling. The uncropped
// master, not the `-cropped` sibling the old portrait hero used: that trim
// existed to fill a tall right-hand column, and this band is wide and shallow.
export const HERO_IMAGE_SRC = "/images-web/Hero/Gallery-4-hero.jpg";

// Panel 3, below the fold: the tagline sits over it. Three bowls on a sunlit
// counter, from the same shoot as the band above, so the two read as one table
// seen twice rather than as two stock photographs.
export const HERO_TAGLINE_IMAGE_SRC = "/images-web/Hero/Gallery-5-hero.jpg";

// Combined "MERŌS" + "House of Yogurt" lockup, Montage Serif baked in. Only
// the dark ink is needed now: the lockup sits in its own cream panel rather
// than over a photograph, so there is no scrim to read light type against.
export const HERO_LOCKUP_SRC = "/logos/name-dark.png";
