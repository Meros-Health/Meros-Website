// Builder ids used before menu.json v2, mapped to registry ids. Only read when
// rehydrating a cart persisted before the change. `null` means the ingredient
// left the menu entirely; ids that map to a recipe-only ingredient are dropped
// later by sanitizeSelection because no step offers them.
//
// Safe to delete once every persisted cart predating 2026-08-26 has expired.
export const LEGACY_ID_MAP: Record<string, string | null> = {
  "base-plain": "plain-greek-yogurt",
  "base-vanilla": "vanilla-greek-yogurt",
  "base-vegan": "vegan-coconut-yogurt",
  "base-protein": "high-protein-yogurt",

  "top-blueberries": "blueberries",
  "top-strawberries": "strawberries",
  "top-banana": "bananas",
  "top-mango": "mangoes",
  "top-pineapple": "pineapples",
  "top-goji": "goji-berries",
  "top-passionfruit": "passion-fruit-mousse",
  "top-avocado": null,

  "top-granola": "house-granola",
  "top-coconut-toasted": "toasted-coconut",
  "top-coconut-shredded": "shredded-coconut",
  "top-cacao-nibs": "cacao-nibs",
  "top-almonds": "almonds",
  "top-almonds-toasted": "almonds",
  "top-pistachios": "pistachios",
  "top-walnuts": "walnuts",
  "top-cashews": "cashews",
  "top-chia": "chia-seeds",
  "top-hemp": "hemp-hearts",
  "top-sunflower": "sunflower-seeds",
  "top-pumpkin": "pumpkin-seeds",
  "top-pb-mousse": "peanut-butter-mousse",
  "top-cocoa-powder": "raw-cocoa-powder",
  "top-bee-pollen": "bee-pollen",

  "drizzle-honey": "local-raw-honey",
  "drizzle-maple": "canadian-maple-syrup",
  "drizzle-evoo": "evoo",

  "supp-whey": "whey-protein-isolate",
  "supp-flax": "flax-meal",
  "supp-nutritional-yeast": "nutritional-yeast",
  "supp-peanut-butter": "peanut-butter",
  "supp-almond-butter": "almond-butter",
  "supp-sea-salt": "flaky-salt",
};
