// Single source of truth for the hero's critical, above-the-fold assets.
// HeroSection renders them; Preloader preloads them, and keeping the list here
// stops the two from drifting apart.

// Right-half portrait (desktop) / full-bleed background (mobile). Pick a frame
// with a light, low-detail top so the layered title stays legible over it.
//
// This is `Gallery-5-hero.jpg` with the bottom 12.5% removed (2880x1919 →
// 2880x1680); the uncropped master is still beside it. The frame is taller
// than it is wide, so `object-cover` scales the image by height and the whole
// of it is visible vertically, which meant a quarter of the frame was empty
// countertop while the nav band covered the top row of bowls. Cutting the dead
// space lets object-cover scale up, so the bowls fill the frame instead.
// Trimming further starts clipping the rims off the side bowls.
export const HERO_RIGHT_IMAGE_SRC = "/images-web/Hero/Gallery-5-hero-cropped.jpg";

// Combined "MERŌS" + "House of Yogurt" lockup, Montage Serif baked in.
// Dark ink reads on the cream desktop canvas; light reads on the mobile scrim.
export const HERO_LOGO_DARK_SRC = "/logos/name-dark.png";
export const HERO_LOGO_LIGHT_SRC = "/logos/name-light.png";
