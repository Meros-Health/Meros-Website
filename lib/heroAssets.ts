// Single source of truth for the hero's critical, above-the-fold assets.
// HeroSection renders them; Preloader preloads them — keeping the list here
// stops the two from drifting apart.

// Right-half portrait (desktop) / full-bleed background (mobile). Pick a frame
// with a light, low-detail top so the layered title stays legible over it.
export const HERO_RIGHT_IMAGE_SRC = "/images-web/Hero/Gallery-8-hero.jpg";

// Combined "MEROS" + "House of Yogurt" lockup, Montage Serif baked in.
// Dark ink reads on the cream desktop canvas; light reads on the mobile scrim.
export const HERO_LOGO_DARK_SRC = "/logos/name-dark.png";
export const HERO_LOGO_LIGHT_SRC = "/logos/name-light.png";
