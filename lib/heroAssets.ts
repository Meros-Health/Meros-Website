// The landing hero's above-the-fold assets. HeroSection renders them as
// `priority` images marked CRITICAL_IMAGE (lib/criticalImages.ts), which is
// what the Preloader and the page transition wait on.

// The whole first screen: the flat-lay, cropped by `object-fit: cover` against
// a full-height panel, with the lockup, the two actions and the tagline centred
// over it. The source is never scaled on one axis to fit; a narrow
// viewport shows less of the frame's width, not a squeezed version of it.
//
// The 2880px Hero/ copy, not the 1024px Gallery/ one. The panel is full-bleed,
// so on a 1440px viewport at DPR 2 the browser asks for a 1920px variant, and
// the gallery source cannot render one without upscaling. The uncropped
// master, not the `-cropped` sibling the old portrait hero used: that trim
// existed to fill a tall right-hand column, and this fills the screen.
export const HERO_IMAGE_SRC = "/images-web/Hero/Gallery-4-hero.jpg";

// Gallery-5-hero.jpg used to be exported here as the ground under the tagline,
// in a second panel below the fold. That panel is gone (see HeroSection) and
// the line moved into the screen above, so nothing references the frame any
// more. It is still in public/images-web/Hero/ and still in the image manifest;
// deleting it is a separate decision from removing the band.

// Combined "MERŌS" + "House of Yogurt" lockup, Montage Serif baked in. The
// cream cut, not the dark one: the lockup now sits over a scrimmed photograph
// rather than in its own cream panel, and dark ink has nothing to read against
// on a bright flat-lay. See .hero-scrim for the ground it is read on.
export const HERO_LOCKUP_SRC = "/logos/name-light.png";
