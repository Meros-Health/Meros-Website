import type { NutritionFacts } from "./nutrition";

export type BuildCategory = "base" | "topping" | "drizzle" | "supplement";

export type BuildTag = "vegan" | "gf" | "high-protein";

export type BuildItem = {
  id: string;
  name: string;
  category: BuildCategory;
  price: number;
  servingLabel: string;
  nutrition: NutritionFacts;
  tags?: BuildTag[];
  description?: string;
};

/** Starting price before item modifiers (bases include their own price). */
export const BASE_BOWL_PRICE = 0;

export const SELECTION_LIMITS = {
  toppings: 8,
  supplements: 3,
  drizzle: 1,
} as const;

export const BUILD_STEPS = [
  { id: "base", label: "Base", number: "01" },
  { id: "toppings", label: "Toppings", number: "02" },
  { id: "drizzle", label: "Drizzle", number: "03" },
  { id: "supplements", label: "Supplements", number: "04" },
] as const;

export type BuildStepId = (typeof BUILD_STEPS)[number]["id"];

// Helper to keep catalog entries concise — all values estimated
function n(
  partial: Partial<NutritionFacts> & Pick<NutritionFacts, "calories" | "protein" | "carbs" | "fat" | "fiber">
): NutritionFacts {
  return {
    calcium: 0,
    iron: 0,
    potassium: 0,
    ...partial,
  };
}

export const BUILD_CATALOG: BuildItem[] = [
  // ── Bases ──────────────────────────────────────────────────────────────────
  {
    id: "base-plain",
    name: "Plain Greek Yogurt",
    category: "base",
    price: 12.0,
    servingLabel: "1 cup",
    description: "Slow-strained, thick, and clean.",
    nutrition: n({ calories: 130, protein: 17, carbs: 9, fat: 4, fiber: 0, calcium: 150, potassium: 220 }),
    tags: ["gf", "high-protein"],
  },
  {
    id: "base-vanilla",
    name: "Vanilla Greek Yogurt",
    category: "base",
    price: 12.5,
    servingLabel: "1 cup",
    description: "House vanilla, naturally sweetened.",
    nutrition: n({ calories: 150, protein: 16, carbs: 14, fat: 4, fiber: 0, calcium: 140, potassium: 210 }),
    tags: ["gf", "high-protein"],
  },
  {
    id: "base-vegan",
    name: "Vegan Yogurt",
    category: "base",
    price: 13.0,
    servingLabel: "1 cup",
    description: "Coconut-oat blend, dairy-free.",
    nutrition: n({ calories: 160, protein: 6, carbs: 18, fat: 8, fiber: 2, calcium: 120, potassium: 180 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "base-protein",
    name: "Protein Greek Yogurt",
    category: "base",
    price: 14.0,
    servingLabel: "1 cup",
    description: "Extra-strained with added whey isolate.",
    nutrition: n({ calories: 180, protein: 24, carbs: 10, fat: 3, fiber: 0, calcium: 160, potassium: 240 }),
    tags: ["gf", "high-protein"],
  },

  // ── Toppings — Fruits ─────────────────────────────────────────────────────
  {
    id: "top-blueberries",
    name: "Blueberries",
    category: "topping",
    price: 1.0,
    servingLabel: "1/2 cup",
    nutrition: n({ calories: 42, protein: 1, carbs: 11, fat: 0, fiber: 2, potassium: 57 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-strawberries",
    name: "Strawberries",
    category: "topping",
    price: 1.0,
    servingLabel: "1/2 cup",
    nutrition: n({ calories: 24, protein: 1, carbs: 6, fat: 0, fiber: 2, potassium: 116 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-banana",
    name: "Banana",
    category: "topping",
    price: 0.75,
    servingLabel: "1/2 banana",
    nutrition: n({ calories: 53, protein: 1, carbs: 14, fat: 0, fiber: 2, potassium: 211 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-mango",
    name: "Mango",
    category: "topping",
    price: 1.25,
    servingLabel: "1/2 cup",
    nutrition: n({ calories: 50, protein: 1, carbs: 12, fat: 0, fiber: 1, potassium: 140 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-pineapple",
    name: "Pineapple",
    category: "topping",
    price: 1.0,
    servingLabel: "1/2 cup",
    nutrition: n({ calories: 41, protein: 0, carbs: 11, fat: 0, fiber: 1, potassium: 90 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-papaya",
    name: "Papaya",
    category: "topping",
    price: 1.25,
    servingLabel: "1/2 cup",
    nutrition: n({ calories: 27, protein: 0, carbs: 7, fat: 0, fiber: 1, potassium: 144 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-goji",
    name: "Goji Berries",
    category: "topping",
    price: 1.5,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 35, protein: 2, carbs: 7, fat: 0, fiber: 2, iron: 1 }),
    tags: ["vegan", "gf"],
  },

  // ── Toppings — Crunch ─────────────────────────────────────────────────────
  {
    id: "top-granola",
    name: "House Granola",
    category: "topping",
    price: 1.0,
    servingLabel: "3 tbsp",
    nutrition: n({ calories: 120, protein: 3, carbs: 18, fat: 5, fiber: 2 }),
  },
  {
    id: "top-coconut-toasted",
    name: "Toasted Coconut",
    category: "topping",
    price: 0.75,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 70, protein: 1, carbs: 3, fat: 7, fiber: 2 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-coconut-shredded",
    name: "Shredded Coconut",
    category: "topping",
    price: 0.75,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 60, protein: 1, carbs: 2, fat: 6, fiber: 2 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-cacao-nibs",
    name: "Cacao Nibs",
    category: "topping",
    price: 1.0,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 60, protein: 1, carbs: 5, fat: 4, fiber: 3, iron: 1 }),
    tags: ["vegan", "gf"],
  },

  // ── Toppings — Nuts ───────────────────────────────────────────────────────
  {
    id: "top-almonds",
    name: "Almonds",
    category: "topping",
    price: 1.25,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 103, protein: 4, carbs: 4, fat: 9, fiber: 2, calcium: 48 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-almonds-toasted",
    name: "Toasted Almonds",
    category: "topping",
    price: 1.25,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 103, protein: 4, carbs: 4, fat: 9, fiber: 2, calcium: 48 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-pistachios",
    name: "Pistachios",
    category: "topping",
    price: 1.5,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 80, protein: 3, carbs: 4, fat: 6, fiber: 2, potassium: 130 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-walnuts",
    name: "Walnuts",
    category: "topping",
    price: 1.25,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 93, protein: 2, carbs: 2, fat: 9, fiber: 1, potassium: 62 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-cashews",
    name: "Cashews",
    category: "topping",
    price: 1.5,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 98, protein: 3, carbs: 5, fat: 8, fiber: 1, iron: 2 }),
    tags: ["vegan", "gf"],
  },

  // ── Toppings — Seeds ──────────────────────────────────────────────────────
  {
    id: "top-chia",
    name: "Chia Seeds",
    category: "topping",
    price: 0.75,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 58, protein: 2, carbs: 5, fat: 4, fiber: 4, calcium: 76 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-hemp",
    name: "Hemp Hearts",
    category: "topping",
    price: 1.0,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 57, protein: 3, carbs: 1, fat: 5, fiber: 1, iron: 1 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-sunflower",
    name: "Sunflower Seeds",
    category: "topping",
    price: 0.75,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 51, protein: 2, carbs: 2, fat: 5, fiber: 1, iron: 1 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-pumpkin",
    name: "Pumpkin Seeds",
    category: "topping",
    price: 1.0,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 47, protein: 2, carbs: 1, fat: 4, fiber: 1, iron: 1, potassium: 85 }),
    tags: ["vegan", "gf"],
  },

  // ── Toppings — Other ──────────────────────────────────────────────────────
  {
    id: "top-avocado",
    name: "Mashed Avocado",
    category: "topping",
    price: 1.5,
    servingLabel: "1/4 avocado",
    nutrition: n({ calories: 60, protein: 1, carbs: 3, fat: 5, fiber: 2, potassium: 180 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-pb-mousse",
    name: "Peanut Butter Mousse",
    category: "topping",
    price: 1.5,
    servingLabel: "2 tbsp",
    nutrition: n({ calories: 95, protein: 4, carbs: 4, fat: 8, fiber: 1 }),
  },
  {
    id: "top-cocoa-powder",
    name: "Raw Cocoa Powder",
    category: "topping",
    price: 0.75,
    servingLabel: "1 tsp",
    nutrition: n({ calories: 12, protein: 1, carbs: 3, fat: 1, fiber: 2, iron: 1 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-passionfruit",
    name: "Passionfruit Preserve",
    category: "topping",
    price: 1.0,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 40, protein: 0, carbs: 10, fat: 0, fiber: 1, potassium: 50 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "top-bee-pollen",
    name: "Bee Pollen",
    category: "topping",
    price: 1.5,
    servingLabel: "1 tsp",
    nutrition: n({ calories: 16, protein: 1, carbs: 3, fat: 0, fiber: 0, iron: 1 }),
  },

  // ── Drizzles ──────────────────────────────────────────────────────────────
  {
    id: "drizzle-honey",
    name: "Raw Honey Drizzle",
    category: "drizzle",
    price: 0.5,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 64, protein: 0, carbs: 17, fat: 0, fiber: 0, potassium: 11 }),
  },
  {
    id: "drizzle-maple",
    name: "Maple Syrup",
    category: "drizzle",
    price: 0.5,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 52, protein: 0, carbs: 13, fat: 0, fiber: 0, potassium: 42 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "drizzle-evoo",
    name: "EVOO Drizzle",
    category: "drizzle",
    price: 0.5,
    servingLabel: "1 tsp",
    nutrition: n({ calories: 40, protein: 0, carbs: 0, fat: 5, fiber: 0 }),
    tags: ["vegan", "gf"],
  },

  // ── Supplements ───────────────────────────────────────────────────────────
  {
    id: "supp-whey",
    name: "Whey Protein",
    category: "supplement",
    price: 2.5,
    servingLabel: "1 scoop",
    description: "Vanilla whey isolate.",
    nutrition: n({ calories: 110, protein: 24, carbs: 2, fat: 1, fiber: 0, calcium: 80 }),
    tags: ["gf", "high-protein"],
  },
  {
    id: "supp-flax",
    name: "Flax Meal",
    category: "supplement",
    price: 1.0,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 37, protein: 1, carbs: 2, fat: 3, fiber: 2, iron: 1 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "supp-nutritional-yeast",
    name: "Nutritional Yeast",
    category: "supplement",
    price: 1.0,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 28, protein: 4, carbs: 3, fat: 0, fiber: 2, iron: 1 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "supp-peanut-butter",
    name: "Peanut Butter",
    category: "supplement",
    price: 1.5,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 94, protein: 4, carbs: 3, fat: 8, fiber: 1, potassium: 90 }),
  },
  {
    id: "supp-almond-butter",
    name: "Almond Butter",
    category: "supplement",
    price: 1.75,
    servingLabel: "1 tbsp",
    nutrition: n({ calories: 98, protein: 3, carbs: 3, fat: 9, fiber: 1, calcium: 43 }),
    tags: ["vegan", "gf"],
  },
  {
    id: "supp-sea-salt",
    name: "Flaky Salt",
    category: "supplement",
    price: 0.25,
    servingLabel: "pinch",
    nutrition: n({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }),
    tags: ["vegan", "gf"],
  },
];

export function getItemsByCategory(category: BuildCategory): BuildItem[] {
  return BUILD_CATALOG.filter((item) => item.category === category);
}

export function getItemById(id: string): BuildItem | undefined {
  return BUILD_CATALOG.find((item) => item.id === id);
}

export function calcBowlPrice(selection: {
  base: BuildItem | null;
  toppings: BuildItem[];
  drizzle: BuildItem | null;
  supplements: BuildItem[];
}): number {
  if (!selection.base) return 0;
  const items = [
    selection.base,
    ...selection.toppings,
    ...(selection.drizzle ? [selection.drizzle] : []),
    ...selection.supplements,
  ];
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function getSelectedItems(selection: {
  base: BuildItem | null;
  toppings: BuildItem[];
  drizzle: BuildItem | null;
  supplements: BuildItem[];
}): BuildItem[] {
  if (!selection.base) return [];
  return [
    selection.base,
    ...selection.toppings,
    ...(selection.drizzle ? [selection.drizzle] : []),
    ...selection.supplements,
  ];
}
