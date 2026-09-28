// What the store ordered, and the rules that decide what may be recorded as a
// purchase. Pure: no D1, no request, no React, so the route handler, the page
// and the unit tests all exercise exactly the same logic.
//
// This is the interim half of Trellum's inventory module. Where a name exists
// on both sides it is spelled the Trellum way (ordered_at, received_at,
// pack_size_g, notes, actor), because the alternative is a migration that has
// to be reasoned about instead of copied.
//
// Two rules are load-bearing and both come from Trellum's model:
//
//   Null is not zero. A missing price is a price nobody has told us. Written
//   as a zero it becomes the cheapest supplier the store has ever used and
//   quietly wins every comparison.
//
//   A purchase is a receipt. pack_price_cents is what was paid that day, and
//   nothing later edits it, so a supplier raising a price cannot rewrite what
//   the store spent last month.

export const SUPPLIER_KINDS = ["wholesale", "club", "retail", "local", "marketplace"] as const;
export type SupplierKind = (typeof SUPPLIER_KINDS)[number];

export function isSupplierKind(value: unknown): value is SupplierKind {
  return (SUPPLIER_KINDS as readonly unknown[]).includes(value);
}

/**
 * How a pack is counted, from the tracker Saima already keeps. These name the
 * container, not its contents: a "Bag" says nothing about whether it holds a
 * kilo or six kiwis, which is what the pack size below is for.
 */
export const PURCHASE_UNITS = [
  "Each",
  "Case",
  "Pack",
  "Bag",
  "Box",
  "Tub",
  "Bottle",
  "Jar",
  "Can",
  "Roll",
  "Unit",
  "kg",
  "lb",
] as const;
export type PurchaseUnit = (typeof PURCHASE_UNITS)[number];

export function isPurchaseUnit(value: unknown): value is PurchaseUnit {
  return (PURCHASE_UNITS as readonly unknown[]).includes(value);
}

/**
 * What one pack contains. Mass converts to grams, which is the unit Trellum
 * stores everything in; "count" is its own axis for things bought by the piece.
 *
 * Volume is deliberately absent. Litres become grams only through a density
 * per ingredient, and defaulting to water would misprice honey by about half.
 * Anyone with a 4L jug can weigh it or leave the size blank.
 */
export const PACK_MEASURES = {
  g: { label: "g", grams: 1 },
  kg: { label: "kg", grams: 1000 },
  oz: { label: "oz", grams: 28.349523125 },
  lb: { label: "lb", grams: 453.59237 },
  count: { label: "count", grams: null },
} as const;
export type PackMeasure = keyof typeof PACK_MEASURES;

export function isPackMeasure(value: unknown): value is PackMeasure {
  return typeof value === "string" && value in PACK_MEASURES;
}

/** Units that already state a mass, so the pack size can be filled in for them. */
export const MASS_UNITS: Partial<Record<PurchaseUnit, PackMeasure>> = { kg: "kg", lb: "lb" };

/**
 * An order still on the way after this many days is treated as a delivery
 * nobody recorded rather than one still in transit, and closes with its
 * duration measured from the order date instead.
 *
 * Inside the window it stays open, because an item is usually marked out
 * precisely when the replacement has not landed yet: archiving that order
 * would record a shelf life of zero for stock that has not been touched.
 */
export const IN_TRANSIT_GRACE_DAYS = 3;

/** A row on the way this long is almost certainly a delivery nobody marked. */
export const STALE_IN_TRANSIT_DAYS = 7;

/**
 * Ceilings, in the spirit of MAX_CUSTOM_ITEMS: far above any real month, there
 * to bound a stuck retry loop rather than to ration a genuine order.
 */
export const MAX_OPEN_PURCHASES_PER_ITEM = 20;
export const MAX_PURCHASES = 5000;

export const MAX_NOTE_LENGTH = 280;

/** $10,000 a pack. A price above this is a typo, not a delivery. */
const MAX_PACK_PRICE_CENTS = 1_000_000;
/** Enough for a pallet of anything the store buys. */
const MAX_QUANTITY = 10_000;
/** 1000 kg in one pack. */
const MAX_PACK_SIZE_G = 1_000_000;
const MAX_PACK_SIZE_COUNT = 100_000;

/** How far either side of today an order date may fall. */
const MAX_BACKDATE_DAYS = 730;
const MAX_FUTUREDATE_DAYS = 30;

export const MS_PER_DAY = 86_400_000;

export type PurchaseRow = {
  id: string;
  item_id: string;
  item_name: string;
  supplier_id: string | null;
  quantity: number;
  unit: string;
  pack_size_g: number | null;
  pack_size_count: number | null;
  pack_price_cents: number | null;
  ordered_at: string;
  received_at: string | null;
  exhausted_at: string | null;
  duration_basis: "received" | "ordered" | null;
  notes: string | null;
  actor: string;
  created_by: string | null;
  created_at: string;
};

export type SupplierRow = {
  id: string;
  name: string;
  kind: SupplierKind | null;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
};

/**
 * The suppliers the store already buys from, as seeded by
 * migrations/0006_staff_purchases.sql. Duplicated here so a dev server with no
 * D1 binding offers the same list production does instead of an empty
 * selector; tests/unit/staffPurchases.test.ts holds the two copies together.
 *
 * Seeding rather than letting staff type them is the point: "Costco" and
 * "costco " entered on two different shifts become two suppliers, and a year
 * of price history stops grouping.
 */
export const SEEDED_SUPPLIERS: ReadonlyArray<{ id: string; name: string; kind: SupplierKind }> = [
  { id: "costco", name: "Costco", kind: "club" },
  { id: "gordon-food-service", name: "Gordon Food Service", kind: "wholesale" },
  { id: "freshpoint-foodservice", name: "FreshPoint Foodservice", kind: "wholesale" },
  { id: "tree-island-yogurt", name: "Tree Island Yogurt", kind: "wholesale" },
  { id: "berrymobile-fruit", name: "Berrymobile Fruit", kind: "wholesale" },
  { id: "yoggu-foods", name: "Yoggu Foods", kind: "wholesale" },
  { id: "tapio", name: "Tapio", kind: "wholesale" },
  { id: "amazon", name: "Amazon", kind: "marketplace" },
  { id: "organic-matters", name: "Organic Matters", kind: "local" },
  { id: "honeybee-centre", name: "Honeybee Centre", kind: "local" },
  { id: "local-produce-supplier", name: "Local / Produce Supplier", kind: "local" },
];

export type PurchaseState = "on-the-way" | "in-use" | "exhausted";

/**
 * The lifecycle, read off the timestamps. There is no status column to read
 * instead, on purpose: a status stored beside its own dates is a second copy
 * of the same fact, and the two drift into rows that claim to be in use with
 * no delivery date. Dates cannot contradict themselves.
 */
export function purchaseState(row: {
  received_at: string | null;
  exhausted_at: string | null;
}): PurchaseState {
  if (row.exhausted_at) return "exhausted";
  return row.received_at ? "in-use" : "on-the-way";
}

/** Whole days between two ISO timestamps, or null if either is unreadable. */
export function daysBetween(fromIso: string, toIso: string): number | null {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return Math.max(0, Math.round((to - from) / MS_PER_DAY));
}

/**
 * How long a delivery lasted, and whether that number is trustworthy.
 *
 * `approximate` is the honest half. When nobody marked the delivery, the only
 * date available is the order date, so the figure silently includes however
 * long the supplier took. Saying so is the difference between a soft number
 * and a wrong one.
 */
export function purchaseDuration(
  row: Pick<PurchaseRow, "ordered_at" | "received_at" | "exhausted_at" | "duration_basis">
): { days: number; approximate: boolean } | null {
  if (!row.exhausted_at) return null;
  const basis = row.duration_basis === "ordered" ? row.ordered_at : (row.received_at ?? null);
  if (!basis) return null;
  const days = daysBetween(basis, row.exhausted_at);
  if (days === null) return null;
  return { days, approximate: row.duration_basis !== "received" };
}

/** One pack in grams, from a size and its measure. Null when it is not a mass. */
export function packSizeInGrams(size: number, measure: PackMeasure): number | null {
  const grams = PACK_MEASURES[measure].grams;
  return grams === null ? null : size * grams;
}

/**
 * Cost per kilo, in cents, for comparing one supplier against another. This is
 * the arithmetic currently living in the Notes column of a spreadsheet.
 */
export function costPerKgCents(row: {
  pack_price_cents: number | null;
  pack_size_g: number | null;
}): number | null {
  if (row.pack_price_cents === null || !row.pack_size_g) return null;
  return (row.pack_price_cents / row.pack_size_g) * 1000;
}

/** Cost of one piece, in cents, for the things bought by the case of 3000. */
export function costPerCountCents(row: {
  pack_price_cents: number | null;
  pack_size_count: number | null;
}): number | null {
  if (row.pack_price_cents === null || !row.pack_size_count) return null;
  return row.pack_price_cents / row.pack_size_count;
}

/** What the whole order cost, in cents. Null when the price is unknown. */
export function totalCents(row: {
  quantity: number;
  pack_price_cents: number | null;
}): number | null {
  return row.pack_price_cents === null ? null : row.quantity * row.pack_price_cents;
}

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

function bad(message: string): { ok: false; message: string } {
  return { ok: false, message };
}

/**
 * Quantity is how many packs, so it is a count of things you can hold and a
 * fraction is legitimate (half a case). Zero is not: an order of nothing is a
 * mis-tap, and recording it would put a row in the current table that can
 * never be anything but noise.
 */
export function checkQuantity(input: unknown): Checked<number> {
  const value = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(value)) return bad("Enter how many you ordered.");
  if (value <= 0) return bad("Enter a quantity above zero.");
  if (value > MAX_QUANTITY) return bad(`Keep the quantity under ${MAX_QUANTITY}.`);
  return { ok: true, value };
}

/**
 * Price of one pack, in cents. Absent is allowed and means nobody knows yet;
 * it is stored as null and never as zero, so an unpriced order cannot win a
 * cheapest-supplier comparison it was never entered into.
 */
export function checkPackPriceCents(input: unknown): Checked<number | null> {
  if (input === null || input === undefined || input === "") return { ok: true, value: null };
  const value = typeof input === "number" ? input : Number(input);
  if (!Number.isFinite(value)) return bad("Enter a price, or leave it blank.");
  if (!Number.isInteger(value)) return bad("Price must be a whole number of cents.");
  if (value < 0) return bad("A price cannot be negative.");
  if (value > MAX_PACK_PRICE_CENTS) return bad("That price looks like a typo.");
  return { ok: true, value };
}

/**
 * The pack size, as a grams-or-count pair. Both null is fine and common: it
 * costs the row its per-kilo comparison and nothing else.
 */
export function checkPackSize(
  sizeInput: unknown,
  measureInput: unknown
): Checked<{ grams: number | null; count: number | null }> {
  const blank = sizeInput === null || sizeInput === undefined || sizeInput === "";
  if (blank) return { ok: true, value: { grams: null, count: null } };

  const size = typeof sizeInput === "number" ? sizeInput : Number(sizeInput);
  if (!Number.isFinite(size)) return bad("Enter a pack size, or leave it blank.");
  if (size <= 0) return bad("A pack size must be above zero.");
  if (!isPackMeasure(measureInput)) return bad("Choose what the pack size is measured in.");

  if (measureInput === "count") {
    if (size > MAX_PACK_SIZE_COUNT) return bad("That pack size looks like a typo.");
    return { ok: true, value: { grams: null, count: size } };
  }

  const grams = packSizeInGrams(size, measureInput);
  if (grams === null || grams > MAX_PACK_SIZE_G) return bad("That pack size looks like a typo.");
  return { ok: true, value: { grams, count: null } };
}

/**
 * The order date, normalised to an ISO timestamp. Bounded either side of today
 * because a date typed as 2206 instead of 2026 would otherwise sit at the top
 * of the archive forever, and a duration measured from it is meaningless.
 */
export function checkOrderedAt(input: unknown, now: Date = new Date()): Checked<string> {
  if (typeof input !== "string" || !input.trim()) return bad("Choose the date it was ordered.");
  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) return bad("Choose the date it was ordered.");

  const days = (parsed - now.getTime()) / MS_PER_DAY;
  if (days > MAX_FUTUREDATE_DAYS) return bad("That date is too far ahead.");
  if (days < -MAX_BACKDATE_DAYS) return bad("That date is too far back.");
  return { ok: true, value: new Date(parsed).toISOString() };
}

export function checkNote(input: unknown): Checked<string | null> {
  if (input === null || input === undefined || input === "") return { ok: true, value: null };
  if (typeof input !== "string") return bad("Notes must be text.");
  const note = input.trim().replace(/\s+/g, " ");
  if (!note) return { ok: true, value: null };
  if (note.length > MAX_NOTE_LENGTH) {
    return bad(`Keep the note to ${MAX_NOTE_LENGTH} characters or fewer.`);
  }
  return { ok: true, value: note };
}

/** The cut-off an open order must predate to be closed as an unmarked delivery. */
export function inTransitCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - IN_TRANSIT_GRACE_DAYS * MS_PER_DAY).toISOString();
}

/** Formats cents as dollars for display. Null stays null; it is not zero. */
export function formatCents(cents: number | null): string | null {
  if (cents === null) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(cents / 100);
}
