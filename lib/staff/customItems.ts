// Items staff add to the inventory board themselves, and the rules that decide
// what may become one. Pure: no D1, no request, no React, so the route handler
// and the unit tests exercise exactly the same logic.
//
// The board's built-in rows are code (lib/staff/catalog.ts, built from the
// registry in lib/menu/menu.json). These are the other kind: rows that exist
// only in D1, that a server created mid-shift, and that never reach the
// builder, the cart, checkout or the Menu TV.
//
// Two invariants hold the two kinds apart, and both are enforced on the server:
//
//   1. A custom id is always "custom:" + a slug the server derived from the
//      name. The client never supplies an id. If it could, a staff session
//      could write a row keyed `bananas` and shadow a registry ingredient, or
//      write an id the namespace check below cannot tell from a built-in.
//   2. Only a "custom:" id may be deleted. That is what makes the 70 registry
//      ingredients and the coded supplies unremovable from the board, rather
//      than merely un-clickable in the UI.

import { INGREDIENT_GROUPS, SUPPLY_GROUPS } from "@/lib/staff/catalog";

export const CUSTOM_PREFIX = "custom:";

/**
 * Ceiling on staff-added rows, across everyone. The board is a shelf walk on a
 * phone; past this it stops being readable, and the number is far above any
 * real month. It exists to bound the table against a stuck retry loop, not to
 * ration a genuine addition.
 */
export const MAX_CUSTOM_ITEMS = 60;

/** Longest name a row can carry without wrapping out of the board's layout. */
export const MAX_NAME_LENGTH = 48;

const MAX_SLUG_LENGTH = 60;

// Letters (any script, accented included), digits, spaces, and the punctuation
// that shows up in real product names: "Sanitizer (Quat)", "Nuts & Seeds",
// "2% Milk", "Half-and-Half". Everything else is refused, control characters
// among them. Not because React would render it unsafely (it escapes), but
// because this row lands on a surface the whole store reads and nobody can
// tidy without a wrangler command.
const NAME_PATTERN = /^[\p{L}\p{N} '&().+/%-]+$/u;

export type StaffTab = "ingredients" | "supplies";

export type StaffSection = {
  name: string;
  tab: StaffTab;
};

/**
 * The sections a new item may be filed under, derived from the board itself so
 * the two can never disagree. Adding a group to lib/staff/catalog.ts makes it
 * an option here on the same commit.
 */
export const STAFF_SECTIONS: StaffSection[] = [
  ...INGREDIENT_GROUPS.map((group) => ({ name: group.name, tab: "ingredients" as const })),
  ...SUPPLY_GROUPS.map((group) => ({ name: group.name, tab: "supplies" as const })),
];

/**
 * Sections that have been renamed, old name to current. A staff-added row
 * stores the section it was filed under, so renaming a group in the catalog
 * would otherwise strand every row still naming the old one: the board matches
 * on the string, finds no group, and the row disappears while still occupying
 * its place against the cap.
 *
 * Same idea as legacyIdMap for renamed ingredient ids. Entries are cheap and
 * permanent; deleting one strands whatever rows still carry it.
 */
const SECTION_ALIASES: Record<string, string> = {
  // 2026-09-25, owner: the group covers more than cleaning.
  "Cleaning + Sanitation": "Maintenance",
};

const SECTION_NAMES = new Set(STAFF_SECTIONS.map((section) => section.name));

/**
 * The section a stored row should be drawn under: itself, or what it was
 * renamed to. Returns null for a name no version of the board ever had, so the
 * caller decides rather than guessing at a home for it.
 */
export function resolveSection(stored: string): string | null {
  if (SECTION_NAMES.has(stored)) return stored;
  const renamed = SECTION_ALIASES[stored];
  return renamed && SECTION_NAMES.has(renamed) ? renamed : null;
}

export function isStaffSection(value: unknown): value is string {
  return typeof value === "string" && SECTION_NAMES.has(value);
}

export function tabForSection(name: string): StaffTab | null {
  return STAFF_SECTIONS.find((section) => section.name === name)?.tab ?? null;
}

export function isCustomStaffItemId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith(CUSTOM_PREFIX) &&
    value.length > CUSTOM_PREFIX.length
  );
}

export function customStaffItemId(slug: string): string {
  return `${CUSTOM_PREFIX}${slug}`;
}

/**
 * The id part of a name: lowercase ASCII, accents folded, everything else a
 * single hyphen. Two people typing "Raspberry Chia Pudding" and
 * "raspberry chia pudding " land on the same id, which is the point: the
 * second one is told the item is already there instead of creating a twin.
 */
export function slugifyStaffItemName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/^-+|-+$/g, "");
}

export type NameCheck = { ok: true; name: string; slug: string } | { ok: false; message: string };

/**
 * Validates a submitted name and returns the tidied name plus its slug. The
 * message is written to be shown to whoever typed it, on the board, so it says
 * what to do rather than what was wrong.
 */
export function checkStaffItemName(input: unknown): NameCheck {
  if (typeof input !== "string") return { ok: false, message: "Enter a name." };

  const name = input.trim().replace(/\s+/g, " ");
  if (!name) return { ok: false, message: "Enter a name." };
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, message: `Keep the name to ${MAX_NAME_LENGTH} characters or fewer.` };
  }
  if (!NAME_PATTERN.test(name)) {
    return { ok: false, message: "Use letters, numbers and basic punctuation only." };
  }

  const slug = slugifyStaffItemName(name);
  if (!slug) return { ok: false, message: "Enter a name with at least one letter or number." };

  return { ok: true, name, slug };
}

/**
 * The built-in row a slug would collide with, if any. Used to answer a
 * duplicate add with "Bananas is already on the board, under Fruits" instead
 * of a second row nobody can tell from the first.
 */
export function builtInItemFor(slug: string): { name: string; section: string } | null {
  for (const group of [...INGREDIENT_GROUPS, ...SUPPLY_GROUPS]) {
    for (const item of group.items) {
      if (item.id === slug) return { name: item.name, section: group.name };
    }
  }
  return null;
}
