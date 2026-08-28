// House style bans the em dash everywhere: rendered copy, code, comments and
// docs. This is enforced rather than remembered because remembering failed
// twice. A page title shipped as "Our Menu <dash> MEROS" and showed in the
// browser tab in production, and the legal pages carried sixteen `&mdash;`
// entities that a literal-character sweep could not see, so they rendered as
// em dashes on /privacy and /terms for real visitors.
//
// The en dash is deliberately allowed. It is correct typography for a numeric
// range ("8 AM - 10 PM", "10-15 min") and is not the tell this rule exists to
// catch.
//
// Needles are built from char codes and fragments so this file holds no
// literal it would flag, and it excludes itself for the same reason.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const CODE = 0x2014;

const PATTERNS: Array<[label: string, needle: string]> = [
  ["literal", String.fromCharCode(CODE)],
  ["named entity", `&${"mdash"};`],
  ["decimal entity", `&#${CODE};`],
  ["hex entity", `&#x${CODE.toString(16)};`],
  ["js escape", `\\u${CODE.toString(16)}`],
];

const ROOT = process.cwd();
const SELF = basename(__filename);

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".open-next", ".git", ".wrangler",
  "graphify-out", "test-results", "playwright-report", "coverage",
  // Captured accessibility snapshots, not text we author.
  ".playwright-cli",
]);

// Text we author. Binary assets and lockfiles are not ours to police.
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".css", ".md", ".json", ".html", ".sh", ".yml", ".yaml"];
const SKIP_FILES = new Set(["package-lock.json", SELF]);

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, found);
    } else if (EXTENSIONS.some((e) => entry.endsWith(e)) && !SKIP_FILES.has(entry)) {
      found.push(full);
    }
  }
  return found;
}

describe("house style", () => {
  it("uses no em dashes anywhere in the repo, literal or encoded", () => {
    const offenders: string[] = [];

    for (const file of walk(ROOT)) {
      readFileSync(file, "utf8").split("\n").forEach((line, i) => {
        for (const [label, needle] of PATTERNS) {
          if (line.includes(needle)) {
            offenders.push(`${relative(ROOT, file)}:${i + 1} (${label})  ${line.trim().slice(0, 90)}`);
            break;
          }
        }
      });
    }

    expect(
      offenders,
      "Em dashes found. Replace with a colon, comma, semicolon, parentheses, " +
        `or restructure the sentence:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
