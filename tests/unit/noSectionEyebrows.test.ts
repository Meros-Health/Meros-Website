// @vitest-environment node
//
// House rule, set by Thomas 2026-09-03: no section eyebrows anywhere on the
// site. An eyebrow is the small-caps kicker parked above a heading ("MENU"
// above "Our Favourites", "OUR STORY" above the story headline).
// It reads as AI-written, and it is almost always redundant with the heading it
// sits on: if the label is worth reading, it belongs in the heading.
//
// What this actually enforces is the word: no component prop, ref, style token
// or CSS variable in the site's own source may be named "eyebrow". That is a
// proxy, not a proof, and it is chosen deliberately. Detecting an eyebrow from
// markup means guessing at font sizes and letter spacing, which would flag
// every form label and footer column heading on the site. Banning the name
// catches the pattern where it is actually reintroduced (a component growing an
// `eyebrow` prop) and, more to the point, makes the rule impossible to miss:
// the failure names the file and says why.
//
// Comments are stripped before the scan, the same way tests/unit/catering.test.ts
// handles its own claim checks, so a file is free to explain why it has no
// kicker. Only live code is held to the ban.
//
// Genuine small-caps labels are untouched and stay legal, because they are not
// eyebrows: form field labels, the footer's column headings, "Size" on the
// build toggle, an item's tag line, the modal's Add/Edit mode indicator, and
// the "Order Received" status on the checkout confirmation. The test for those
// is whether removing the label costs the reader information.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const SELF = basename(__filename);
const DIRS = ["app", "components", "lib"];
const EXTENSIONS = [".ts", ".tsx", ".css"];

/** Line and block comments out, so a file may name the rule it is following. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/.*$/gm, "");

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, found);
    } else if (EXTENSIONS.some((e) => entry.endsWith(e)) && entry !== SELF) {
      found.push(full);
    }
  }
  return found;
}

describe("house style", () => {
  it("has no section eyebrows anywhere on the site", () => {
    const offenders: string[] = [];

    for (const dir of DIRS) {
      for (const file of walk(join(ROOT, dir))) {
        stripComments(readFileSync(file, "utf8"))
          .split("\n")
          .forEach((line, i) => {
            if (/eyebrow/i.test(line)) {
              offenders.push(`${relative(ROOT, file)}:${i + 1}  ${line.trim().slice(0, 90)}`);
            }
          });
      }
    }

    expect(
      offenders,
      "Section eyebrows are banned. Put the label in the heading, or drop it:\n" +
        offenders.join("\n"),
    ).toEqual([]);
  });
});
