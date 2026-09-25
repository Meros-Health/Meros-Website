// What the staff inventory board (/staff) tracks, in the order the board
// shows it. Ingredient names come from the registry (lib/menu/menu.json)
// through the same accessor everything else uses; only the grouping and
// ordering live here. Supplies have no registry, so their names live here too.
//
// Ordering is the design: within a group, sub-clusters (the berries, the three
// mousses, the protein powders) sit together, separated by `gapAbove` on the
// first item of each cluster. tests/unit/staffInventory.test.ts holds this
// file and the registry together: every registry ingredient appears exactly
// once, so an ingredient added to menu.json fails the build until it has a
// place on the board.

import { ingredientName } from "@/lib/menu/ingredients";

export const STAFF_STATUSES = ["in", "low", "out"] as const;
export type StaffStatus = (typeof STAFF_STATUSES)[number];

export function isStaffStatus(value: unknown): value is StaffStatus {
  return (STAFF_STATUSES as readonly unknown[]).includes(value);
}

export type StaffItemDef = {
  id: string;
  name: string;
  /** Starts a new sub-cluster: the row above gets breathing room. */
  gapAbove?: boolean;
};

export type StaffGroupDef = {
  name: string;
  items: StaffItemDef[];
};

/** `"|id"` marks the first item of a sub-cluster. */
function ingredients(name: string, ids: string[]): StaffGroupDef {
  return {
    name,
    items: ids.map((entry) => {
      const gapAbove = entry.startsWith("|");
      const id = gapAbove ? entry.slice(1) : entry;
      return {
        id,
        name: LABEL_OVERRIDES[id] ?? ingredientName(id),
        ...(gapAbove ? { gapAbove } : {}),
      };
    }),
  };
}

// The registry names both pb-powder and peanut-butter almost identically
// ("Peanut Butter" / "Peanut Butter (Whole)"), which works in their separate
// menu contexts but not side by side on a shelf checklist.
const LABEL_OVERRIDES: Record<string, string> = {
  "pb-powder": "Peanut Butter (Powder)",
};

export const INGREDIENT_GROUPS: StaffGroupDef[] = [
  ingredients("Yogurt", [
    "plain-greek-yogurt",
    "vanilla-greek-yogurt",
    "vegan-coconut-yogurt",
    "high-protein-yogurt",
  ]),
  ingredients("Fruits", [
    // Berries, stone fruit and vine, then tropical.
    "strawberries",
    "blueberries",
    "blackberries",
    "raspberries",
    "|peaches",
    "nectarines",
    "melon",
    "|pineapples",
    "mangoes",
    "papaya",
    "dragon-fruit",
    "bananas",
  ]),
  ingredients("Nuts", [
    // Coconut and goji are dried, not nuts, but they live on the same shelf.
    "almonds",
    "walnuts",
    "cashews",
    "peanuts",
    "pistachios",
    "|coconut",
    "goji-berries",
  ]),
  ingredients("Seeds", [
    "pumpkin-seeds",
    "sunflower-seeds",
    "chia-seeds",
    "flax-meal",
    "hemp-hearts",
  ]),
  ingredients("Finishes", [
    // Syrups, granolas, mousses, spreads, toppers, then the pudding.
    "canadian-maple-syrup",
    "local-raw-honey",
    "|house-granola",
    "chocolate-granola",
    "|chocolate-mousse",
    "peanut-butter-mousse",
    "passion-fruit-mousse",
    "|peanut-butter",
    "almond-butter",
    "|chocolate",
    "sea-salt",
    "cinnamon",
    "evoo",
    "|berry-chia-pudding",
  ]),
  ingredients("Enhancers", [
    // Proteins, greens, fruit powders, adaptogens, then pantry.
    "whey-protein-isolate",
    "chocolate-whey-protein-isolate",
    "collagen-peptides",
    "creatine-monohydrate",
    "l-glutamine",
    "pb-powder",
    "|greens-powder",
    "spirulina",
    "chlorella",
    "moringa",
    "matcha",
    "|acai-powder",
    "pitaya-powder",
    "camu-camu",
    "|maca-powder",
    "ashwagandha",
    "lions-mane",
    "turmeric-black-pepper",
    "|nutritional-yeast",
    "wheat-germ",
    "mct-oil",
    "cacao-nibs",
    "raw-cocoa-powder",
    "bee-pollen",
  ]),
  ingredients("Smoothie Bar", ["coconut-milk", "house-whey-water", "cold-brew-coffee"]),
];

export const SUPPLY_GROUPS: StaffGroupDef[] = [
  {
    name: "Serviceware",
    items: [
      { id: "bowls-medium", name: "Medium Bowls" },
      { id: "bowls-large", name: "Large Bowls" },
      { id: "bowl-lids", name: "Bowl Lids" },
      { id: "smoothie-cups", name: "Smoothie Cups (22 oz)" },
      { id: "spoons", name: "Spoons", gapAbove: true },
      { id: "sampling-spoons", name: "Sampling Spoons" },
      { id: "straws", name: "Straws" },
      { id: "napkins", name: "Napkins" },
      { id: "to-go-bags", name: "To-Go Bags" },
      { id: "ice-bags", name: "Ice Bags" },
    ],
  },
  {
    name: "Cleaning + Sanitation",
    items: [
      { id: "sanitizer-fluid", name: "Sanitizer Fluid" },
      { id: "sanitizer-test-strips", name: "Sanitizer Test Strips" },
      { id: "dish-soap", name: "Dish Soap" },
      { id: "hand-soap", name: "Hand Soap" },
      { id: "paper-towels", name: "Paper Towels", gapAbove: true },
      { id: "nitrile-gloves", name: "Nitrile Gloves" },
      { id: "cleaning-cloths", name: "Cleaning Cloths" },
      { id: "garbage-bags", name: "Garbage Bags" },
    ],
  },
  {
    name: "Back of House",
    items: [
      { id: "toilet-paper", name: "Toilet Paper" },
      { id: "receipt-paper", name: "Receipt Paper" },
      { id: "label-stickers", name: "Label Stickers" },
      { id: "first-aid", name: "First Aid Restock" },
    ],
  },
];

const ALL_IDS = new Set(
  [...INGREDIENT_GROUPS, ...SUPPLY_GROUPS].flatMap((group) => group.items.map((item) => item.id))
);

export function listStaffItemIds(): string[] {
  return [...ALL_IDS];
}

export function isStaffItemId(id: string): boolean {
  return ALL_IDS.has(id);
}
