// The landing hero's above-the-fold assets. HeroSection renders them as
// `priority` images marked CRITICAL_IMAGE (lib/criticalImages.ts), which is
// what the Preloader and the page transition wait on.

// Panel 1, the whole first screen: the flat-lay, cropped by `object-fit:
// cover` against a full-height panel, with the lockup and the two actions
// centred over it. The source is never scaled on one axis to fit; a narrow
// viewport shows less of the frame's width, not a squeezed version of it.
//
// The 2880px Hero/ copy, not the 1024px Gallery/ one. The panel is full-bleed,
// so on a 1440px viewport at DPR 2 the browser asks for a 1920px variant, and
// the gallery source cannot render one without upscaling. The uncropped
// master, not the `-cropped` sibling the old portrait hero used: that trim
// existed to fill a tall right-hand column, and this fills the screen.
export const HERO_IMAGE_SRC = "/images-web/Hero/Gallery-4-hero.jpg";

// Panel 2, below the fold: the tagline sits over it. Three bowls on a sunlit
// counter, from the same shoot as the screen above, so the two read as one
// table seen twice rather than as two stock photographs.
export const HERO_TAGLINE_IMAGE_SRC = "/images-web/Hero/Gallery-5-hero.jpg";

// Combined "MERŌS" + "House of Yogurt" lockup, Montage Serif baked in. The
// cream cut, not the dark one: the lockup now sits over a scrimmed photograph
// rather than in its own cream panel, and dark ink has nothing to read against
// on a bright flat-lay. See .hero-scrim for the ground it is read on.
export const HERO_LOCKUP_SRC = "/logos/name-light.png";
