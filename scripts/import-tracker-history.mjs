#!/usr/bin/env node
// Turns Saima's ordering tracker into SQL for the staff_purchases table.
//
// The workbook is the only record of what the store paid for anything before
// the ordering log existed: 202 purchases between 2026-02-03 and 2026-09-24,
// across seven suppliers. It is not in this repo and should not be, so this
// script is the derivation, checked in so the import can be re-run and
// reviewed rather than performed once by hand.
//
// It reads two sheets. "Price History" is one row per purchase with date,
// item, supplier, quantity, unit and cost per unit. "Invoice Line Items"
// carries the pack size for most of the same lines ("300 per case", "1.36
// kg"), which is what makes prices comparable between suppliers, so the two
// are joined on item and date.
//
// WHAT IT DOES NOT KNOW. The tracker never recorded when anything ran out, so
// no imported row carries a duration and none is inferred. Every one is
// marked with source_file, which is what files it as history rather than as
// something still on order, and what lets the page say where it came from.
//
// SPEND WITH NO BOARD ITEM is imported too, under a spend_class. Dropping it
// would answer "what did we order" while losing "what did we spend", and the
// second is the question nobody could answer. The classes are not one thing:
// see migrations/0007_purchase_provenance.sql.
//
// Output is SQL on stdout, INSERT OR REPLACE against deterministic ids, so
// running it twice changes nothing. Apply it with:
//   node scripts/import-tracker-history.mjs ~/Downloads/<tracker>.xlsx > /tmp/import.sql
//   npx wrangler d1 execute meros-orders --local --file /tmp/import.sql
//
// Plain Node, no dependencies, same as validate-menu.mjs. An .xlsx is a zip of
// XML, and the two readers below are the whole reason this file is long.

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { createHash } from "node:crypto";
import { argv, exit } from "node:process";

/** Every file in a zip, by name. Stored and deflated entries only, which is all an .xlsx uses. */
function unzip(buf) {
  // The end-of-central-directory record is last, after a comment of unknown
  // length, so it is found by scanning backwards for its signature.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip: no end-of-central-directory record");

  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map();

  for (let i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("bad central directory entry");
    const method = buf.readUInt16LE(p + 10);
    const compressedSize = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const localOffset = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString("utf8");

    // The local header repeats the name and carries its own extra field, whose
    // length differs from the central one, so both must be read here.
    const lNameLen = buf.readUInt16LE(localOffset + 26);
    const lExtraLen = buf.readUInt16LE(localOffset + 28);
    const start = localOffset + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(start, start + compressedSize);

    files.set(name, method === 0 ? raw : inflateRawSync(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

// ---------------------------------------------------------------- xlsx reader

const unescapeXml = (s) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");

/** Column letters to a 1-based index: A is 1, AA is 27. */
function columnIndex(ref) {
  const letters = /^([A-Z]+)/.exec(ref)[1];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/**
 * One worksheet as an array of rows, each a Map of column index to string
 * value.
 *
 * Every tag is matched with an optional namespace prefix. Excel writes plain
 * `<sheet>`; the exporter that produced this workbook writes `<x:sheet>`, and
 * a reader that assumes either one silently finds nothing.
 */
const tag = (name) => `<(?:\\w+:)?${name}`;
const pair = (name) => new RegExp(`${tag(name)}[^>]*>([\\s\\S]*?)</(?:\\w+:)?${name}>`, "g");

function readSheet(files, sheetName) {
  const workbook = files.get("xl/workbook.xml").toString("utf8");
  const rels = files.get("xl/_rels/workbook.xml.rels").toString("utf8");

  // The name is XML-escaped in the workbook part, so "Supplier & Cost" is
  // written "Supplier &amp; Cost", and it has to be matched in that form.
  const escaped = sheetName
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sheetTag = new RegExp(`${tag("sheet")}[^>]*name="${escaped}"[^>]*>`).exec(workbook);
  if (!sheetTag) throw new Error(`no sheet named ${sheetName}`);
  const rid = /r:id="([^"]+)"/.exec(sheetTag[0])[1];
  // Attribute order in the rels part is not guaranteed, so find the element
  // carrying this id and then read its Target, rather than assuming Id comes
  // first.
  const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)]
    .map((m) => m[0])
    .find((el) => el.includes(`Id="${rid}"`));
  if (!rel) throw new Error(`no relationship ${rid} for sheet ${sheetName}`);
  const target = /Target="([^"]+)"/.exec(rel)[1].replace(/^\//, "");
  const path = target.startsWith("xl/") ? target : `xl/${target}`;

  // Shared strings: most cell text is an index into this table, not inline.
  const sharedXml = files.get("xl/sharedStrings.xml")?.toString("utf8") ?? "";
  const shared = [...sharedXml.matchAll(pair("si"))].map((m) =>
    unescapeXml([...m[1].matchAll(pair("t"))].map((t) => t[1]).join(""))
  );

  const xml = files.get(path).toString("utf8");
  const cellRe = new RegExp(`${tag("c")}\\s([^>]*?)(?:/>|>([\\s\\S]*?)</(?:\\w+:)?c>)`, "g");
  const valueRe = new RegExp(`${tag("v")}[^>]*>([\\s\\S]*?)</(?:\\w+:)?v>`);

  const rows = [];
  for (const rowMatch of xml.matchAll(pair("row"))) {
    const cells = new Map();
    for (const cell of rowMatch[1].matchAll(cellRe)) {
      const attrs = cell[1];
      const body = cell[2] ?? "";
      const ref = /r="([A-Z]+\d+)"/.exec(attrs)?.[1];
      if (!ref) continue;
      const type = /t="([^"]+)"/.exec(attrs)?.[1];
      const v = valueRe.exec(body)?.[1];
      let value = null;
      if (type === "s" && v !== undefined) value = shared[Number(v)];
      else if (type === "inlineStr")
        value = unescapeXml([...body.matchAll(pair("t"))].map((t) => t[1]).join(""));
      else if (v !== undefined) value = unescapeXml(v);
      if (value !== null && value !== "") cells.set(columnIndex(ref), value);
    }
    rows.push(cells);
  }
  return rows;
}

/** Excel stores a date as days since 1899-12-30. */
function excelDate(serial) {
  const n = Number(serial);
  if (!Number.isFinite(n)) return null;
  const ms = Date.UTC(1899, 11, 30) + n * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}


// ---------------------------------------------------------------- mappings

/**
 * The tracker names products the way suppliers invoice them, so every line
 * here is a judgement someone made and the owner confirmed on 2026-09-28.
 *
 * A string is a board item id. An array is spend with no board item, and its
 * second element is why, which becomes the spend_class.
 */
const ITEM_MAP = {
  // --- Yogurt. Tree Island bills the format, not the product.
  "15kg Greek - Natural": "plain-greek-yogurt",
  "15kg Cream Top - Vanilla - Homogenized": "vanilla-greek-yogurt",
  "15kg Greek - Natural 0%": "high-protein-yogurt",
  "Yogurt Plain Coconut Plant-Based Vegan": "vegan-coconut-yogurt",
  "Yogurt Vanilla Coconut Plant-Based Vegan": "vegan-coconut-yogurt",
  "Yoggu Original Plant-Based Yogurt 3.5kg": "vegan-coconut-yogurt",

  // --- Fruit, named by grower or brand. Frozen and fresh share a board row;
  // they are simply two purchases of it, from different suppliers.
  "Berrymobile Albion Strawberries": "strawberries",
  "Kahlon Farms Albion Strawberries": "strawberries",
  "Krause Berry Farms Albion Strawberries": "strawberries",
  "Fennec Frozen Whole Strawberries, 5 x 1 kg (5 x 1 kg)": "strawberries",
  "Berrymobile Blackberries": "blackberries",
  "Blackberry Fresh": "blackberries",
  "Berrymobile Fall Raspberries": "raspberries",
  "Fennec Frozen Whole Raspberries, 5 x 1 kg (5 kg)": "raspberries",
  "IQF RASPBERRIES 5 X 1 KG T18H5P90 (5 kg)": "raspberries",
  "Nature's Touch Organic Raspberries (1.5 kg)": "raspberries",
  "Krause Berry Farms Blueberries": "blueberries",
  "Berryhill Foods Blueberries": "blueberries",
  "Blueberry Fresh": "blueberries",
  "Kirkland Signature Blueberries (2 kg)": "blueberries",
  "Kirkland Signature Grade A Frozen Whole Blueberries, 2 kg (2 kg)": "blueberries",
  Bananas: "bananas",
  "Bananas, 1.36 kg (3 lb)": "bananas",
  "Banana (1.36 kg)": "bananas",
  "Banana Stage 4/5": "bananas",
  "IQF SLICED BANANAS FENNEC FOODS SLICED BANANAS 5 x 1 kg(8888650) (5 x 1 kg)": "bananas",
  Mangoes: "mangoes",
  "Fennec Frozen Mango Chunks, 5 x 1 kg (5 x 1 kg)": "mangoes",
  "Red Mangoes, 4 kg (each)": "mangoes",
  "Mango Chunk IQF": "mangoes",
  "Diced Mango (850g)": "mangoes",
  "Fennec Frozen Pineapple Chunks, 5 x 1 kg (5 x 1 kg)": "pineapples",
  "Pineapples Golden Shell": "pineapples",
  "CV Nectarines": "nectarines",
  "Yellow Nectarine (1 each)": "nectarines",
  "Yellow Nectarines (1 each)": "nectarines",
  "Peaches Handi Pak - Okanagan": "peaches",
  "White Peaches, 1.81 kg (1 each)": "peaches",
  "Maradol's Papaya": "papaya",
  "Papaya 7-10ct": "papaya",
  "Hami Melon (1 each)": "melon",
  "Dragon Fruit": "dragon-fruit",

  // --- Nuts, seeds, butters.
  "Yupik Sliced Almonds, 1 kg (1 kg)": "almonds",
  "Kirkland Signature Shelled Pistachios, 680 g (680 g)": "pistachios",
  "Kirkland Signature Roasted Whole Unsalted Cashews, 1.13 kg (1.13 kg)": "cashews",
  "Kirkland Signature Shelled Walnuts, 1.36 kg (1.36 kg)": "walnuts",
  "Yupik California Walnuts, 2 kg (2 kg)": "walnuts",
  "Kirkland Signature Organic Hemp Hearts (907 g)": "hemp-hearts",
  "Kirkland Signature Organic Hemp Hearts, 907 g (907 g)": "hemp-hearts",
  "Bassé Organic Pumpkin Seeds, 1.2 kg (1.2 kg)": "pumpkin-seeds",
  "Yupik Sunflower Seeds, 2 kg (2 kg)": "sunflower-seeds",
  "Kirkland Signature Organic Chia Seeds (1.36 kg)": "chia-seeds",
  "Kirkland Signature Organic Chia Seeds, 1.36 kg (1.36 kg)": "chia-seeds",
  "Webber Naturals Organic Cold Milled Ground Flaxseed (900 g)": "flax-meal",
  "Yupik Blanched Peanuts, 2 kg (2 kg)": "peanuts",
  "Nuts to You Smooth Peanut Butter, 4 kg (4 kg)": "peanut-butter",
  "Kirkland Signature Creamy Almond Butter (765 g)": "almond-butter",
  "Kirkland Signature Creamy Almond Butter, 765 g (765 g)": "almond-butter",
  "Sunco Unsweetened Fancy Shredded Coconut P144 (2 kg)": "coconut",
  "Sunco Unsweetened Shredded Coconut, 2 kg (2 kg)": "coconut",

  // --- Finishes. The board row is what the store buys: the chocolate granola
  // is made from the house granola, and the mousse from the puree.
  "Granola Chunky Supreme": "house-granola",
  "Cereal Granola Plain": "house-granola",
  "Decacer Pure Maple Syrup, 540 mL (540 ml)": "canadian-maple-syrup",
  "Passionfruit Puree Frozen": "passion-fruit-mousse",

  // --- Enhancers.
  "Leanfit Whey Protein, Chocolate, 2 kg (2 kg)": "chocolate-whey-protein-isolate",
  "Leanfit Sport Creatine Monohydrate, 1kg (1 kg)": "creatine-monohydrate",
  "Organika Enhanced Collagen, 2kg (2 kg)": "collagen-peptides",
  "Yupik Cocoa Powder, 1.5 kg (1.5 kg)": "raw-cocoa-powder",
  "Stok Cold Brew Coffee Beverage, 2 x 1.42 L (2 x 1.42 L)": "cold-brew-coffee",
  "SToK Cold Brew Coffee, Black, Unsweetened (2 x 1.42 L)": "cold-brew-coffee",

  // --- Serviceware and supplies, mostly Tapio.
  "16oz Bamboo Square Bowl – Tree Free": "square-containers-16oz",
  "22oz Bamboo Square Bowl – Tree Free": "square-containers-22oz",
  "PET Lid for 16/22oz Bamboo Square Bowl": "square-container-lids",
  "24oz Rectangular Kraft Food Box": "delivery-containers-24oz",
  "PET Clear Lid for Rectangular Food Box": "delivery-container-lids-24oz",
  '10x5x12" Insulated Bag – Beige': "insulated-bags-large",
  '8.25x4.7x11" Insulated Bag – Beige': "insulated-bags-regular",
  '9x9" Beverage Napkin 1-Ply – White': "napkins",
  '8" Paper BBT Straw – White Wrapped, 12mm Slant Cut': "straws",
  "24oz PP Cold Cup (700ml) 95mm": "smoothie-cups",
  "iECO Ice Cream Spoon 9.5cm, Pack of 1000 (1 each)": "spoons",
  "iECO - Birch Teaspoons, pack of 500 (500 ct)": "spoons",
  "iECO - Birch Teaspoons, 500-pack (500 ct)": "spoons",
  '6" Compostable Bamboo Spoon': "spoons",
  "Charmin Ultra Soft Bathroom Tissue, 30 x 200 sheets (30 ct)": "toilet-paper",
  "Purex Premium 2-ply Bathroom Tissue, 40-pack (1 each)": "toilet-paper",
  "Kirkland Signature Large Garbage Bags (100 ct)": "garbage-bags",
  "Sani Guard Large Vinyl Gloves, 4 packs of 100 (4 x 100 ct)": "nitrile-gloves",
  "*RICKI BLACK BENCH 4605BK REG 1088819 (1200 x 4 oz)": "sample-cups-4oz",

  // --- Spend with no board item. Kept, classed, and totalled on the page.
  "Organic Red Seedless Grapes, 1.36 kg (1 each)": ["", "off-menu"],
  "Seedless Green Grapes 1.36 KG (1.36 kg)": ["", "off-menu"],
  Plums: ["", "off-menu"],
  "Kiwi Fruit": ["", "off-menu"],
  "Gold Kiwi, 1.36 kg (1 each)": ["", "off-menu"],

  "Lychee Puree Frozen": ["", "trial"],
  "Prickly Pear Puree Frozen": ["", "trial"],
  "Sour Cherry Puree Frozen": ["", "trial"],
  "Granadilla (Golden Passion Fruit)": ["", "trial"],
  "Avocado Pulp Pure Fresh": ["", "trial"],

  "Whipping Cream, 1 L (1000 ml)": ["", "untracked"],
  "35% M.F. Whipping Cream (1 L)": ["", "untracked"],
  "Lactantia Whipping Cream, 1 L (1000 ml)": ["", "untracked"],
  "Medallion Milk Co. Whole Milk Powder, 1kg (1 kg)": ["", "untracked"],
  "16oz Rectangular Kraft Food Box": ["", "untracked"],
  "32oz Rectangular Kraft Food Box": ["", "untracked"],
  "95mm Paper Sealing Film for Cups – White": ["", "untracked"],
  "LID 3.25OZ PORTION CUP 1200/CS P45L15 (4 x 300 ct)": ["", "untracked"],

  "Kirkland Signature Organic Free-Range Large Eggs, 24-count (24 ct)": ["", "staff"],
  "Balderson Cheddar Cheese Block, 750 g (750 g)": ["", "staff"],
  "Balderson Double-smoked Cheddar Cheese Block, 500 g (500 g)": ["", "staff"],
  "Natrel 2% Lactose-Free Milk, 2 L (2 L)": ["", "staff"],
  "Natrel Lactose-free 2% Milk, 2 L (2 L)": ["", "staff"],
  "Natrel Lactose Free 2% (2 L)": ["", "staff"],
  "Rogers Icing Sugar, 1 kg (1000 g)": ["", "staff"],

  "Cup Sealing Machine – 95mm": ["", "capital"],
};

/** Her supplier names to the slugs seeded by migrations/0006. */
const SUPPLIER_MAP = {
  Costco: "costco",
  "Gordon Food Service (GFS)": "gordon-food-service",
  GFS: "gordon-food-service",
  "FreshPoint Foodservice": "freshpoint-foodservice",
  "Tree Island Yogurt / Canadian Cultured Dairy Inc.": "tree-island-yogurt",
  "Berrymobile Fruit Distribution Inc.": "berrymobile-fruit",
  "Yoggu Foods": "yoggu-foods",
  Tapio: "tapio",
  Amazon: "amazon",
  "Organic Matters": "organic-matters",
  "Honeybee Centre": "honeybee-centre",
  "Local / Produce Supplier": "local-produce-supplier",
};

const GRAMS = { g: 1, kg: 1000, oz: 28.349523125, lb: 453.59237 };
const UNITS = new Set([
  "Each", "Case", "Pack", "Bag", "Box", "Tub", "Bottle", "Jar", "Can", "Roll", "Unit", "kg", "lb",
]);

/**
 * The pack size an invoice line states, as grams or as a count. The invoice
 * register writes it a dozen ways and volume is deliberately refused: litres
 * become grams only through a density per ingredient, and guessing water
 * would misprice honey by about half.
 */
function parsePackSize(raw) {
  const s = String(raw || "").trim().toLowerCase();
  if (!s) return { g: null, count: null };

  let m = /^([\d.]+)\s*x\s*([\d.]+)\s*(kg|g|lb|oz)\b/.exec(s);
  if (m) return { g: Number(m[1]) * Number(m[2]) * GRAMS[m[3]], count: null };

  // "12x1lb (12 lb)" and "12x1pt (10 lb)" state the true total in brackets.
  m = /\(([\d.]+)\s*(kg|g|lb|oz)\)/.exec(s);
  if (m) return { g: Number(m[1]) * GRAMS[m[2]], count: null };

  m = /^([\d.]+)\s*(kg|g|lb|oz)\b/.exec(s);
  if (m) return { g: Number(m[1]) * GRAMS[m[2]], count: null };

  m = /^([\d.]+)\s*(?:ct|count|per case|per can|per roll|per unit|each)\b/.exec(s);
  if (m) return { g: null, count: Number(m[1]) };

  m = /^([\d.]+)\s*x\s*[\d.]+\s*oz\b/.exec(s);
  if (m) return { g: null, count: Number(m[1]) };

  return { g: null, count: null }; // volume, or a description rather than a size
}


// ---------------------------------------------------------------- main

const SOURCE_LABEL = "Meros_Inventory_Ordering_Tracker.xlsx";
const sqlStr = (v) =>
  v === null || v === undefined || v === "" ? "NULL" : `'${String(v).replace(/'/g, "''")}'`;
const sqlNum = (v) => (v === null || v === undefined || !Number.isFinite(v) ? "NULL" : String(v));

const source = argv[2];
if (!source) {
  console.error("usage: node scripts/import-tracker-history.mjs <tracker.xlsx> > import.sql");
  exit(1);
}

const files = unzip(readFileSync(source));

// Pack sizes live on the invoice register, keyed by the same item name and
// date as the purchase. A later line wins, which only matters where a
// supplier re-invoiced the same day.
const packByKey = new Map();
const packKey = (name, date) => `${name}@@${date}`;
for (const row of readSheet(files, "Invoice Line Items").slice(3)) {
  const name = row.get(5);
  const date = excelDate(row.get(2));
  if (!name || !date) continue;
  const size = parsePackSize(row.get(10));
  if (size.g || size.count) packByKey.set(packKey(name, date), size);
}

const COL = { date: 1, item: 3, supplier: 4, qty: 5, unit: 6, perUnit: 8, ref: 10 };

const rows = [];
const problems = [];
const unmapped = new Set();

for (const row of readSheet(files, "Price History").slice(3)) {
  const name = row.get(COL.item);
  if (!name || name === "Item") continue;
  const orderedAt = excelDate(row.get(COL.date));
  if (!orderedAt) continue;

  const mapped = ITEM_MAP[name];
  if (mapped === undefined) {
    unmapped.add(name);
    continue;
  }
  const itemId = typeof mapped === "string" ? mapped : null;
  const spendClass = typeof mapped === "string" ? "stock" : mapped[1];

  const unit = row.get(COL.unit);
  if (!UNITS.has(unit)) {
    problems.push(`${name}: unit ${JSON.stringify(unit)} is not one of ours`);
    continue;
  }

  const quantity = Number(row.get(COL.qty));
  if (!Number.isFinite(quantity) || quantity <= 0) {
    problems.push(`${name} on ${orderedAt}: quantity ${JSON.stringify(row.get(COL.qty))}`);
    continue;
  }

  // "Cost / Unit" is the price of one pack, which is what this column stores.
  // Integer cents, because a price read off a receipt should survive a round
  // trip unchanged.
  const perUnit = Number(row.get(COL.perUnit));
  const packPriceCents = Number.isFinite(perUnit) ? Math.round(perUnit * 100) : null;

  const supplierName = row.get(COL.supplier);
  const supplierId = supplierName ? SUPPLIER_MAP[supplierName.trim()] ?? null : null;
  if (supplierName && !supplierId) {
    problems.push(`unknown supplier ${JSON.stringify(supplierName)}`);
  }

  const pack = packByKey.get(packKey(name, orderedAt)) ?? { g: null, count: null };

  // A deterministic id, so re-running the import replaces rather than
  // duplicates. Everything that identifies the line goes into it.
  const id =
    "trk_" +
    createHash("sha256")
      .update([orderedAt, name, supplierId ?? "", quantity, packPriceCents ?? "", unit].join("|"))
      .digest("hex")
      .slice(0, 24);

  const ref = row.get(COL.ref);
  rows.push({
    id,
    itemId,
    itemName: name,
    supplierId,
    quantity,
    unit,
    packSizeG: pack.g,
    packSizeCount: pack.count,
    packPriceCents,
    orderedAt: `${orderedAt}T12:00:00.000Z`,
    notes: ref ? String(ref) : null,
    spendClass,
  });
}

if (unmapped.size) {
  console.error("UNMAPPED item names (add them to ITEM_MAP):");
  for (const n of unmapped) console.error("  " + n);
  exit(1);
}

const now = new Date().toISOString();
const out = [
  "-- Generated by scripts/import-tracker-history.mjs. Do not edit by hand.",
  `-- Source: ${SOURCE_LABEL}`,
  `-- ${rows.length} purchases. Re-running replaces these rows rather than adding to them.`,
  // No BEGIN/COMMIT: D1 refuses explicit SQL transactions and points at the
  // Durable Object storage API instead. Local miniflare accepts them, which
  // hides it until the remote run. Not needed here anyway: every statement is
  // INSERT OR REPLACE against a deterministic id, so a partial apply is fixed
  // by running the file again.
];
for (const r of rows) {
  out.push(
    "INSERT OR REPLACE INTO staff_purchases (id, item_id, item_name, supplier_id, quantity, unit, " +
      "pack_size_g, pack_size_count, pack_price_cents, ordered_at, received_at, exhausted_at, " +
      "duration_basis, notes, actor, spend_class, source_file, created_by, created_at) VALUES (" +
      [
        sqlStr(r.id),
        r.itemId ? sqlStr(r.itemId) : "NULL",
        sqlStr(r.itemName),
        r.supplierId ? sqlStr(r.supplierId) : "NULL",
        sqlNum(r.quantity),
        sqlStr(r.unit),
        sqlNum(r.packSizeG === null ? null : Number(r.packSizeG.toFixed(3))),
        sqlNum(r.packSizeCount),
        sqlNum(r.packPriceCents),
        sqlStr(r.orderedAt),
        "NULL", // received_at: the tracker never recorded a delivery date
        "NULL", // exhausted_at: nor when anything ran out
        "NULL", // duration_basis: so no duration is claimed
        sqlStr(r.notes),
        "'user'",
        sqlStr(r.spendClass),
        sqlStr(SOURCE_LABEL),
        "NULL",
        sqlStr(now),
      ].join(", ") +
      ");"
  );
}
console.log(out.join("\n"));

// Everything below goes to stderr so stdout stays pipeable SQL.
const tally = rows.reduce((m, r) => ((m[r.spendClass] = (m[r.spendClass] || 0) + 1), m), {});
const cents = rows.reduce((t, r) => t + r.quantity * (r.packPriceCents ?? 0), 0);
console.error(`\n${rows.length} purchases, $${(cents / 100).toFixed(2)}`);
console.error("by spend class:", tally);
console.error(`with a pack size: ${rows.filter((r) => r.packSizeG || r.packSizeCount).length}`);
console.error(
  `distinct board items: ${new Set(rows.filter((r) => r.itemId).map((r) => r.itemId)).size}`
);
if (problems.length) {
  console.error("\nproblems:");
  for (const p of [...new Set(problems)]) console.error("  " + p);
}
