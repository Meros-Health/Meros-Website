// @vitest-environment node
//
// House rule, set by Thomas 2026-09-04: Canadian spelling, every word, always.
// The store is in Yaletown and the footer already ships "Yaletown,
// Vancouver" under BUSINESS.address.neighbourhood, so an American spelling in
// a headline reads as an import rather than as a local business.
//
// What this scans is copy, not code. "color" and "center" are the names of a
// CSS property and a Tailwind utility, and `role="dialog"` is an ARIA value:
// those are API identifiers that happen to be spelled the American way, and
// renaming them breaks the page. So the scan looks only at text a visitor can
// actually read:
//
//   .tsx  JSX text nodes. Attribute values, expressions and the code around
//         them are stripped first, which is what makes it safe to flag
//         "center" here and not in className="text-center".
//   .ts   String literals, in the modules that hold copy rather than logic.
//         Listed explicitly: a whitelist of files is a smaller thing to keep
//         honest than a blacklist of every identifier on the site.
//   .json The menu, whose names and descriptions are read off the page.
//
// Words left out on purpose, because both spellings are correct in Canadian
// English and picking one would fail good copy: -ize/-ization (realize,
// organization), practice/practise and licence/license, where the spelling
// turns on whether the word is a noun or a verb, program, aluminum, tire, and
// judgment in its legal sense.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

/** American form to Canadian form. The key is matched whole-word, any case. */
const SPELLINGS: Record<string, string> = {
  favorite: "favourite",
  favorites: "favourites",
  color: "colour",
  colors: "colours",
  colorful: "colourful",
  flavor: "flavour",
  flavors: "flavours",
  flavorful: "flavourful",
  honor: "honour",
  labor: "labour",
  humor: "humour",
  behavior: "behaviour",
  neighbor: "neighbour",
  neighbors: "neighbours",
  neighborhood: "neighbourhood",
  odor: "odour",
  savor: "savour",
  savory: "savoury",
  center: "centre",
  centers: "centres",
  centered: "centred",
  fiber: "fibre",
  liter: "litre",
  liters: "litres",
  theater: "theatre",
  defense: "defence",
  offense: "offence",
  gray: "grey",
  catalog: "catalogue",
  analog: "analogue",
  traveled: "travelled",
  traveling: "travelling",
  canceled: "cancelled",
  canceling: "cancelling",
  cancelation: "cancellation",
  labeled: "labelled",
  labeling: "labelling",
  modeling: "modelling",
  fueled: "fuelled",
  fulfill: "fulfil",
  fulfills: "fulfils",
  fulfillment: "fulfilment",
  enrollment: "enrolment",
  installment: "instalment",
  acknowledgment: "acknowledgement",
  skillful: "skilful",
  willful: "wilful",
  maneuver: "manoeuvre",
  mold: "mould",
  smolder: "smoulder",
};

const PATTERN = new RegExp(`\\b(${Object.keys(SPELLINGS).join("|")})\\b`, "gi");

// Copy lives in these; everything else under lib/ is logic.
const COPY_MODULES = [
  "lib/catering/content.ts",
  "lib/checkout/messages.ts",
  "lib/home/homeGallery.ts",
  "lib/business.ts",
  "lib/seo.ts",
  "lib/menu/nutrition.ts",
];

/**
 * Lowercase string literals that name a field rather than a thing on screen.
 * The nutrition data has a "fiber" key on every ingredient, and the type union
 * and segment ids that go with it; renaming those breaks the board, the
 * builder and the validator, while the customer never sees any of them. The
 * check is case-sensitive on purpose: ids in this codebase are lowercase and
 * labels are capitalised, so "fiber" passes and "Fiber" does not, which is
 * exactly the distinction being drawn.
 */
const IDENTIFIER_LITERALS = new Set(["fiber"]);

const MENU = "lib/menu/menu.json";
const PAGES_AND_COMPONENTS = ["app", "components"];

const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/.*$/gm, "");

// Characters that only ever appear in code, never inside a run of JSX text.
// A fragment holding any of them is markup or an expression, not something a
// visitor reads, which is what keeps `style={{ color: ... }}` and
// `const CENTER = SIZE / 2` out of a scan that flags "color" and "center".
const CODE_CHARS = /[<>{}="`;]/;

/**
 * The text a .tsx line puts on screen. Two shapes, because Prettier produces
 * both: text between tags on one line, and text wrapped onto lines of its own.
 *
 * The wrapped form additionally has to look like prose, two words with a space
 * between them, or a bare `fiber,` in an object literal would read as copy.
 * That costs the scan a one-word heading on its own line and is worth it: a
 * false positive on every identifier in the codebase would get the whole test
 * deleted inside a week.
 */
function jsxText(line: string): string {
  const inline = [...line.matchAll(/>([^<>{}="`]+)</g)].map((m) => m[1]);
  const bare = line.trim();
  if (!CODE_CHARS.test(bare) && /[A-Za-z]+\s+[A-Za-z]/.test(bare)) inline.push(bare);
  return inline.join(" ");
}

/**
 * A CSS value carried in a string, which is markup by another route: the
 * nutrition segments each name their own swatch as "var(--color-midnight)" or
 * a color-mix() of two of them. Those are property and token names, spelled
 * the way CSS spells them, and the customer reads none of it.
 */
const CSS_VALUE = /var\(--|color-mix\(|^--/;

/** Every string literal on a line, quotes dropped, ids and CSS left out. */
function stringLiterals(line: string): string {
  return (line.match(/"[^"]*"|'[^']*'|`[^`]*`/g) ?? [])
    .map((literal) => literal.slice(1, -1))
    .filter((literal) => !IDENTIFIER_LITERALS.has(literal) && !CSS_VALUE.test(literal))
    .join(" ");
}

function walk(dir: string): string[] {
  const { readdirSync, statSync } = require("node:fs") as typeof import("node:fs");
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (entry.endsWith(".tsx")) found.push(full);
  }
  return found;
}

function offendersIn(file: string, extract: (line: string) => string): string[] {
  const out: string[] = [];
  // A double quote left open at the end of a line means the next line is
  // inside a string, which is how a long className wraps. Those lines carry
  // "items-center" and look exactly like prose to the bare-text rule, so the
  // scan has to know it is still inside the attribute.
  let inString = false;
  stripComments(readFileSync(join(ROOT, file), "utf8"))
    .split("\n")
    .forEach((line, i) => {
      const opensString = (line.match(/"/g) ?? []).length % 2 === 1;
      const scanning = !inString;
      if (opensString) inString = !inString;
      if (!scanning) return;
      for (const match of extract(line).matchAll(PATTERN)) {
        const word = match[1].toLowerCase();
        out.push(`${file}:${i + 1}  "${match[1]}" should be "${SPELLINGS[word]}"`);
      }
    });
  return out;
}

/**
 * The menu is scanned as parsed JSON rather than as text, because half its
 * strings are keys. "fiber" is the name of a field on every ingredient's
 * nutrition object and renaming it would break the board, the builder and the
 * validator; "Fibre" is what a customer reads, and that is a label rendered
 * elsewhere. Keys are structure, values are copy.
 */
function menuOffenders(): string[] {
  const out: string[] = [];
  const visit = (node: unknown, path: string) => {
    if (typeof node === "string") {
      for (const match of node.matchAll(PATTERN)) {
        out.push(`${MENU} at ${path}  "${match[1]}" should be "${SPELLINGS[match[1].toLowerCase()]}"`);
      }
    } else if (Array.isArray(node)) {
      node.forEach((child, i) => visit(child, `${path}[${i}]`));
    } else if (node && typeof node === "object") {
      for (const [key, child] of Object.entries(node)) visit(child, `${path}.${key}`);
    }
  };
  visit(JSON.parse(readFileSync(join(ROOT, MENU), "utf8")), "menu");
  return out;
}

describe("house style", () => {
  it("spells every visible word the Canadian way", () => {
    const offenders = [
      ...PAGES_AND_COMPONENTS.flatMap((dir) =>
        walk(join(ROOT, dir)).map((f) => f.slice(ROOT.length + 1)),
      ).flatMap((f) => offendersIn(f, jsxText)),
      ...COPY_MODULES.flatMap((f) => offendersIn(f, stringLiterals)),
      ...menuOffenders(),
    ];

    expect(
      offenders,
      "Canadian spelling, every word. If one of these is an API name rather " +
        "than copy, the scan is reading code it should not be:\n" + offenders.join("\n"),
    ).toEqual([]);
  });
});
