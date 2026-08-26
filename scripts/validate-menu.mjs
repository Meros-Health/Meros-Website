#!/usr/bin/env node
// Validates lib/menu/menu.json before anything renders from it.
//
// Runs as `npm run validate:menu`, before every website build, and at the top
// of ../menu-tv/sync-menu.sh. Plain Node, no dependencies, so the Menu TV
// tooling can call it without installing the website's node_modules.
//
// Every failure prints one line and the process exits 1. Warnings print but
// do not fail the run.
//
// Usage:  node scripts/validate-menu.mjs [path/to/menu.json]

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const menuPath = resolve(process.argv[2] ?? join(repoRoot, "lib/menu/menu.json"));
const publicDir = join(repoRoot, "public");

const NUTRITION_FIELDS = ["calories", "protein", "carbs", "fat", "fiber", "calcium", "iron", "potassium"];
const NUTRITION_STATUSES = ["provisional", "needs-label", "needs-recipe", "verified"];
const PRICING_MODES = ["surcharge-only", "included-then-extra", "hard-cap"];
const ID_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const isObj = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
const isNonEmptyString = (v) => typeof v === "string" && v.trim().length > 0;
const isMoney = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;
const isCount = (v) => Number.isInteger(v) && v >= 0;

function checkId(id, where) {
  if (!isNonEmptyString(id)) return fail(`${where}: missing id`);
  if (!ID_PATTERN.test(id)) fail(`${where}: id "${id}" must be lowercase kebab-case`);
}

function checkUnique(ids, where) {
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) fail(`${where}: duplicate id "${id}"`);
    seen.add(id);
  }
}

// ---------------------------------------------------------------------------

let menu;
try {
  menu = JSON.parse(readFileSync(menuPath, "utf8"));
} catch (err) {
  console.error(`validate-menu: cannot read ${menuPath}: ${err.message}`);
  process.exit(1);
}

if (menu.version !== 2) fail(`version: expected 2, got ${JSON.stringify(menu.version)}`);

// sizeTiers -----------------------------------------------------------------
const sizeTiers = isObj(menu.sizeTiers) ? menu.sizeTiers : {};
if (!isObj(menu.sizeTiers)) fail("sizeTiers: missing");
for (const [category, tiers] of Object.entries(sizeTiers)) {
  if (!Array.isArray(tiers) || tiers.length === 0) {
    fail(`sizeTiers.${category}: must be a non-empty array`);
    continue;
  }
  tiers.forEach((tier, i) => {
    checkId(tier?.id, `sizeTiers.${category}[${i}]`);
    if (!isNonEmptyString(tier?.label)) fail(`sizeTiers.${category}[${i}]: missing label`);
  });
  checkUnique(tiers.map((t) => t?.id), `sizeTiers.${category}`);
}

// ingredients ---------------------------------------------------------------
const ingredients = Array.isArray(menu.ingredients) ? menu.ingredients : [];
if (!Array.isArray(menu.ingredients) || menu.ingredients.length === 0) fail("ingredients: must be a non-empty array");
const ingredientIds = new Set();
const ingredientNames = new Map();

ingredients.forEach((ing, i) => {
  const where = `ingredients[${i}]${ing?.id ? ` (${ing.id})` : ""}`;
  checkId(ing?.id, where);
  if (!isNonEmptyString(ing?.name)) fail(`${where}: missing name`);
  if (!isNonEmptyString(ing?.servingLabel)) fail(`${where}: missing servingLabel`);
  if (!NUTRITION_STATUSES.includes(ing?.nutritionStatus)) {
    fail(`${where}: nutritionStatus must be one of ${NUTRITION_STATUSES.join(", ")}`);
  }
  if (!isObj(ing?.nutrition)) {
    fail(`${where}: missing nutrition`);
  } else {
    for (const field of NUTRITION_FIELDS) {
      const v = ing.nutrition[field];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0) fail(`${where}: nutrition.${field} must be a number >= 0`);
    }
    for (const field of Object.keys(ing.nutrition)) {
      if (!NUTRITION_FIELDS.includes(field)) fail(`${where}: unknown nutrition field "${field}"`);
    }
  }
  if (ing?.tags !== undefined && (!Array.isArray(ing.tags) || !ing.tags.every(isNonEmptyString))) {
    fail(`${where}: tags must be an array of strings`);
  }
  if (ing?.description !== undefined && !isNonEmptyString(ing.description)) fail(`${where}: description must be a string`);

  if (isNonEmptyString(ing?.id)) ingredientIds.add(ing.id);
  if (isNonEmptyString(ing?.name)) {
    const key = ing.name.toLowerCase();
    if (ingredientNames.has(key)) fail(`${where}: name "${ing.name}" duplicates ${ingredientNames.get(key)}`);
    ingredientNames.set(key, ing.id);
  }
});
checkUnique(ingredients.map((i) => i?.id), "ingredients");

// build ---------------------------------------------------------------------
const build = isObj(menu.build) ? menu.build : {};
if (!isObj(menu.build)) fail("build: missing");

const buildSizes = Array.isArray(build.sizes) ? build.sizes : [];
if (buildSizes.length === 0) fail("build.sizes: must be a non-empty array");
buildSizes.forEach((size, i) => {
  checkId(size?.id, `build.sizes[${i}]`);
  if (!isNonEmptyString(size?.label)) fail(`build.sizes[${i}]: missing label`);
  if (!isMoney(size?.price)) fail(`build.sizes[${i}]: price must be a number >= 0`);
});
checkUnique(buildSizes.map((s) => s?.id), "build.sizes");

if (build.intro !== undefined && !isNonEmptyString(build.intro)) fail("build.intro: must be a string");

const steps = Array.isArray(build.steps) ? build.steps : [];
if (steps.length === 0) fail("build.steps: must be a non-empty array");
checkUnique(steps.map((s) => s?.id), "build.steps");
const offeredIds = new Set();

steps.forEach((step, i) => {
  const where = `build.steps[${i}]${step?.id ? ` (${step.id})` : ""}`;
  checkId(step?.id, where);
  if (!isNonEmptyString(step?.label)) fail(`${where}: missing label`);
  if (step?.select !== "one" && step?.select !== "multi") fail(`${where}: select must be "one" or "multi"`);
  if (typeof step?.required !== "boolean") fail(`${where}: required must be a boolean`);
  if (step?.note !== undefined && !isNonEmptyString(step.note)) fail(`${where}: note must be a string`);

  const options = Array.isArray(step?.options) ? step.options : [];
  if (options.length === 0) fail(`${where}: options must be a non-empty array`);

  const pricing = isObj(step?.pricing) ? step.pricing : {};
  if (!isObj(step?.pricing)) fail(`${where}: missing pricing`);
  const mode = pricing.mode;
  if (!PRICING_MODES.includes(mode)) fail(`${where}: pricing.mode must be one of ${PRICING_MODES.join(", ")}`);

  if (step?.select === "one" && mode !== "surcharge-only") {
    fail(`${where}: select "one" steps must use pricing.mode "surcharge-only"`);
  }

  if (mode === "included-then-extra") {
    if (!isCount(pricing.included)) fail(`${where}: pricing.included must be an integer >= 0`);
    if (!isMoney(pricing.extraPrice)) fail(`${where}: pricing.extraPrice must be a number >= 0`);
    if (isCount(pricing.included) && pricing.included > options.length) {
      fail(`${where}: pricing.included (${pricing.included}) exceeds option count (${options.length})`);
    }
    if (pricing.bundle !== undefined) {
      const b = pricing.bundle;
      if (!isObj(b)) fail(`${where}: pricing.bundle must be an object`);
      else {
        if (!Number.isInteger(b.count) || b.count < 2) fail(`${where}: pricing.bundle.count must be an integer >= 2`);
        if (!isMoney(b.price)) fail(`${where}: pricing.bundle.price must be a number >= 0`);
        if (!isNonEmptyString(b.label)) fail(`${where}: pricing.bundle.label missing`);
        // The pricer applies bundles greedily. That is only the cheapest
        // combination when a bundle undercuts buying its items one at a time.
        if (isMoney(b.price) && isMoney(pricing.extraPrice) && Number.isInteger(b.count) && b.price >= b.count * pricing.extraPrice) {
          fail(`${where}: pricing.bundle.price (${b.price}) must be less than count * extraPrice (${b.count * pricing.extraPrice})`);
        }
      }
    }
  } else if (pricing.bundle !== undefined || pricing.included !== undefined || pricing.extraPrice !== undefined) {
    fail(`${where}: included / extraPrice / bundle are only valid with pricing.mode "included-then-extra"`);
  }

  if (mode === "hard-cap") {
    if (!Number.isInteger(pricing.max) || pricing.max < 1) fail(`${where}: pricing.max must be an integer >= 1`);
    else if (pricing.max > options.length) fail(`${where}: pricing.max (${pricing.max}) exceeds option count (${options.length})`);
  } else if (pricing.max !== undefined) {
    fail(`${where}: pricing.max is only valid with pricing.mode "hard-cap"`);
  }

  const seenOptions = new Set();
  options.forEach((opt, j) => {
    const optWhere = `${where}.options[${j}]`;
    if (!isNonEmptyString(opt?.ingredientId)) return fail(`${optWhere}: missing ingredientId`);
    if (!ingredientIds.has(opt.ingredientId)) fail(`${optWhere}: ingredient "${opt.ingredientId}" does not exist`);
    if (seenOptions.has(opt.ingredientId)) fail(`${optWhere}: "${opt.ingredientId}" listed twice in this step`);
    seenOptions.add(opt.ingredientId);
    if (offeredIds.has(opt.ingredientId)) fail(`${optWhere}: "${opt.ingredientId}" is already offered in another step`);
    offeredIds.add(opt.ingredientId);
    if (opt.surcharge !== undefined) {
      if (!isMoney(opt.surcharge) || opt.surcharge === 0) fail(`${optWhere}: surcharge must be a number > 0`);
      if (mode !== "surcharge-only") fail(`${optWhere}: option surcharge is only valid on pricing.mode "surcharge-only" steps`);
    }
    for (const key of Object.keys(opt)) {
      if (key !== "ingredientId" && key !== "surcharge") fail(`${optWhere}: unknown field "${key}"`);
    }
  });
});

// signatures ----------------------------------------------------------------
const signatures = isObj(menu.signatures) ? menu.signatures : {};
if (!isObj(menu.signatures)) fail("signatures: missing");
const referencedIds = new Set();
const signatureIds = [];

const CATEGORY_TIERS = { bowls: "bowl", smoothies: "smoothie" };
for (const [listKey, tierKey] of Object.entries(CATEGORY_TIERS)) {
  const items = Array.isArray(signatures[listKey]) ? signatures[listKey] : [];
  if (!Array.isArray(signatures[listKey])) fail(`signatures.${listKey}: missing`);
  const tiers = Array.isArray(sizeTiers[tierKey]) ? sizeTiers[tierKey] : [];
  const tierIds = tiers.map((t) => t?.id);
  const pricesBySize = new Map();

  items.forEach((item, i) => {
    const where = `signatures.${listKey}[${i}]${item?.id ? ` (${item.id})` : ""}`;
    checkId(item?.id, where);
    if (isNonEmptyString(item?.id)) signatureIds.push(item.id);
    if (!isNonEmptyString(item?.name)) fail(`${where}: missing name`);
    if (!Array.isArray(item?.tags) || !item.tags.every(isNonEmptyString)) fail(`${where}: tags must be an array of strings`);
    if (item?.ingredients !== undefined) fail(`${where}: "ingredients" is no longer supported, use "recipe" (ingredient ids)`);

    if (!Array.isArray(item?.recipe) || item.recipe.length === 0) {
      fail(`${where}: recipe must be a non-empty array of ingredient ids`);
    } else {
      const seen = new Set();
      item.recipe.forEach((id, j) => {
        if (!isNonEmptyString(id)) return fail(`${where}.recipe[${j}]: must be a string`);
        if (!ingredientIds.has(id)) fail(`${where}.recipe[${j}]: ingredient "${id}" does not exist`);
        if (seen.has(id)) fail(`${where}.recipe[${j}]: "${id}" listed twice`);
        seen.add(id);
        referencedIds.add(id);
      });
    }

    if (!isObj(item?.sizes)) {
      fail(`${where}: missing sizes`);
    } else {
      const sizeKeys = Object.keys(item.sizes);
      for (const tierId of tierIds) {
        if (!sizeKeys.includes(tierId)) fail(`${where}: sizes is missing tier "${tierId}"`);
      }
      for (const key of sizeKeys) {
        if (!tierIds.includes(key)) fail(`${where}: sizes has unknown tier "${key}" (sizeTiers.${tierKey} defines ${tierIds.join(", ")})`);
        const s = item.sizes[key];
        if (!isObj(s)) { fail(`${where}: sizes.${key} must be an object`); continue; }
        if (!isMoney(s.price)) fail(`${where}: sizes.${key}.price must be a number >= 0`);
        if (!isCount(s.calories)) fail(`${where}: sizes.${key}.calories must be an integer >= 0`);
        if (!isCount(s.protein)) fail(`${where}: sizes.${key}.protein must be an integer >= 0`);
        if (isMoney(s.price)) {
          if (!pricesBySize.has(key)) pricesBySize.set(key, new Set());
          pricesBySize.get(key).add(s.price);
        }
      }
    }

    if (!isObj(item?.images)) {
      fail(`${where}: missing images`);
    } else {
      for (const kind of ["photo", "transparent"]) {
        const p = item.images[kind];
        if (!isNonEmptyString(p) || !p.startsWith("/")) fail(`${where}: images.${kind} must be an absolute public path`);
        else if (!existsSync(join(publicDir, p))) fail(`${where}: images.${kind} "${p}" not found under public/`);
      }
    }
  });

  // The Menu TV prints one price header per panel ("$12 / $15"), so every
  // item in a category has to share the same price at each size.
  for (const [sizeId, prices] of pricesBySize) {
    if (prices.size > 1) {
      fail(`signatures.${listKey}: items disagree on the "${sizeId}" price (${[...prices].join(", ")}); the Menu TV prints a single price per panel`);
    }
  }
}
checkUnique(signatureIds, "signatures");

// Orphans are legal (an ingredient can be staged before it is offered), but
// they are usually a leftover from a removal, so surface them.
for (const id of ingredientIds) {
  if (!offeredIds.has(id) && !referencedIds.has(id)) {
    warn(`ingredient "${id}" is neither offered in a build step nor used in a recipe`);
  }
}

// ---------------------------------------------------------------------------

for (const w of warnings) console.warn(`validate-menu: warning: ${w}`);
if (errors.length > 0) {
  for (const e of errors) console.error(`validate-menu: error: ${e}`);
  console.error(`validate-menu: ${errors.length} error(s) in ${menuPath}`);
  process.exit(1);
}
console.log(
  `validate-menu: ok (${ingredientIds.size} ingredients, ${steps.length} build steps, ${signatureIds.length} signatures)`
);
