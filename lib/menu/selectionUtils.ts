// The persisted shape of a custom bowl, plus everything needed to bring an
// older or tampered payload back to a valid one.
import {
  BUILD_CONFIG,
  getBuildSize,
  getDefaultBuildSizeId,
  getStepForIngredient,
  isOffered,
} from "./buildConfig";
import type { BowlSelection } from "./calcBowlPrice";
import { getIngredient } from "./ingredients";
import { LEGACY_ID_MAP } from "./legacyIdMap";

export type { BowlSelection } from "./calcBowlPrice";

export function emptySelection(sizeId: string = getDefaultBuildSizeId()): BowlSelection {
  return { sizeId, steps: {} };
}

// ---------------------------------------------------------------------------
// Migration
// ---------------------------------------------------------------------------

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Older payloads stored whole catalog objects; newer ones store ids. Accept both. */
function readId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (isRecord(value) && typeof value.id === "string") return value.id;
  return null;
}

function readIdList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(readId).filter((id): id is string => id !== null);
}

/**
 * Cart payloads before v2 had one of two shapes, both keyed by the builder's
 * old step names and holding full catalog objects:
 *   { base, toppings, drizzle, supplements }
 *   { base, fruitsBerries, nutsSeeds, finish, enhancers }
 * Collect every id in a stable order; the step each one belongs to is
 * re-derived from the current menu, since categories moved between versions.
 */
function collectLegacyIds(raw: UnknownRecord): string[] {
  const ids: string[] = [];
  const base = readId(raw.base);
  if (base) ids.push(base);
  ids.push(...readIdList(raw.toppings));
  ids.push(...readIdList(raw.fruitsBerries));
  ids.push(...readIdList(raw.nutsSeeds));
  const finish = readId(raw.drizzle) ?? readId(raw.finish);
  if (finish) ids.push(finish);
  ids.push(...readIdList(raw.supplements));
  ids.push(...readIdList(raw.enhancers));
  return ids;
}

function mapLegacyId(id: string): string | null {
  if (id in LEGACY_ID_MAP) return LEGACY_ID_MAP[id];
  return id;
}

/**
 * Turns any persisted selection (v2, or either pre-v2 shape) into a v2
 * BowlSelection. Returns null when the payload is not a selection at all.
 * The result is not yet guaranteed valid against the current menu; run
 * sanitizeSelection next.
 */
export function migrateLegacySelection(raw: unknown): BowlSelection | null {
  if (!isRecord(raw)) return null;

  if (isRecord(raw.steps)) {
    const steps: Record<string, string[]> = {};
    for (const [stepId, value] of Object.entries(raw.steps)) {
      steps[stepId] = readIdList(value);
    }
    const sizeId = typeof raw.sizeId === "string" ? raw.sizeId : getDefaultBuildSizeId();
    return { sizeId, steps };
  }

  if (!("base" in raw)) return null;

  const steps: Record<string, string[]> = {};
  for (const legacyId of collectLegacyIds(raw)) {
    const id = mapLegacyId(legacyId);
    if (!id) continue;
    const step = getStepForIngredient(id);
    if (!step) continue;
    const list = (steps[step.id] ??= []);
    if (!list.includes(id)) list.push(id);
  }
  return { sizeId: getDefaultBuildSizeId(), steps };
}

// ---------------------------------------------------------------------------
// Sanitizing
// ---------------------------------------------------------------------------

/**
 * Drops anything the current menu does not offer: unknown steps, unknown
 * ingredients, ingredients not offered in that step, duplicates, picks beyond
 * a step's select / hard-cap limit, and an unknown size (falls back to the
 * default size). Returns null only when a required step ends up empty, so a
 * bowl that lost one topping keeps the rest.
 */
export function sanitizeSelection(selection: BowlSelection): BowlSelection | null {
  const sizeId = getBuildSize(selection.sizeId) ? selection.sizeId : getDefaultBuildSizeId();
  const steps: Record<string, string[]> = {};

  for (const step of BUILD_CONFIG.steps) {
    const seen = new Set<string>();
    let ids = (selection.steps[step.id] ?? []).filter((id) => {
      if (seen.has(id) || !isOffered(step.id, id) || !getIngredient(id)) return false;
      seen.add(id);
      return true;
    });
    if (step.select === "one") ids = ids.slice(0, 1);
    if (step.pricing.mode === "hard-cap") ids = ids.slice(0, step.pricing.max);
    if (step.required && ids.length === 0) return null;
    if (ids.length > 0) steps[step.id] = ids;
  }

  return { sizeId, steps };
}

/** migrate + sanitize in one call, for cart rehydration and edit pages. */
export function normalizeSelection(raw: unknown): BowlSelection | null {
  const migrated = migrateLegacySelection(raw);
  return migrated ? sanitizeSelection(migrated) : null;
}

// ---------------------------------------------------------------------------
// Matching
// ---------------------------------------------------------------------------

/** Stable fingerprint: size plus sorted ids per step. Sorts copies, never the persisted order. */
export function getSelectionKey(selection: BowlSelection): string {
  const parts = Object.keys(selection.steps)
    .filter((stepId) => (selection.steps[stepId]?.length ?? 0) > 0)
    .sort()
    .map((stepId) => `${stepId}:${[...selection.steps[stepId]].sort().join(",")}`);
  return `${selection.sizeId}|${parts.join("|")}`;
}

export function selectionsMatch(a: BowlSelection, b: BowlSelection): boolean {
  return getSelectionKey(a) === getSelectionKey(b);
}

/** Same product at a different size is a separate line, so both must match. */
export function findMatchingSignatureLine<
  T extends { kind: string; productId: string; size?: { id: string } },
>(items: T[], productId: string, sizeId: string | undefined): T | undefined {
  return items.find(
    (i) => i.kind === "signature" && i.productId === productId && i.size?.id === sizeId
  );
}

export function findMatchingCustomLine<T extends { kind: string; selection?: unknown }>(
  items: T[],
  selection: BowlSelection
): T | undefined {
  const key = getSelectionKey(selection);
  return items.find((i) => {
    if (i.kind !== "custom" || !i.selection) return false;
    const normalized = normalizeSelection(i.selection);
    return normalized !== null && getSelectionKey(normalized) === key;
  });
}

/** Name of the first pick in the first required step: "Plain Greek Yogurt". */
export function getSelectionHeadline(selection: BowlSelection): string | undefined {
  for (const step of BUILD_CONFIG.steps) {
    if (!step.required) continue;
    const id = selection.steps[step.id]?.[0];
    if (id) return getIngredient(id)?.name;
  }
  return undefined;
}
