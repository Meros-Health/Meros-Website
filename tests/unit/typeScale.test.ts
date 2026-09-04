// @vitest-environment node
//
// The type scale is only a scale if components use it. Before tailwind.config.ts
// grew a `fontSize` block there were 116 hand-written sizes across 27 files, 104
// of them the same four micro values, and three competing systems for letter
// spacing: four semantic tokens with 8 uses between them, 50 stock
// tracking-widest, and 36 arbitrary values across 10 numbers (two of which,
// 0.20em and 0.2em, produced identical CSS from different class strings).
//
// This test is what stops that coming back. It scans class strings only, so it
// has nothing to say about a CSS custom property or an inline fontSize: those
// are for values genuinely computed per element, which the scale cannot hold.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

const EXTENSIONS = [".ts", ".tsx"];

// Sizes that are deliberately outside the scale, with the reason. A file only
// belongs here when nothing else on the site sets the value and a token would
// therefore have exactly one user.
const ALLOWED = new Map([
  ["components/build/MacroRingChart.tsx", "the ring's centre numeral is sized to the ring"],
]);

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) found.push(full);
  }
  return found;
}

const sources = ["app", "components"].flatMap((d) => walk(d));

describe("the type scale", () => {
  it("is declared in tailwind.config.ts", () => {
    const sizes = config.theme?.extend?.fontSize as Record<string, string> | undefined;
    expect(sizes).toBeDefined();
    expect(Object.keys(sizes ?? {})).toEqual(
      expect.arrayContaining(["badge", "meta", "label", "note", "caption", "body"]),
    );
  });

  it("has no arbitrary font sizes outside the allowlist", () => {
    const offenders = sources
      .filter((f) => !ALLOWED.has(f))
      .filter((f) => /text-\[[0-9.]+(px|rem|em)\]/.test(readFileSync(f, "utf8")));
    expect(offenders, "use a fontSize token: text-label, text-note, text-body").toEqual([]);
  });

  it("keeps the allowlist honest", () => {
    // An entry that no longer has an arbitrary size is an entry to delete.
    for (const [file, reason] of ALLOWED) {
      expect(/text-\[[0-9.]+(px|rem|em)\]/.test(readFileSync(file, "utf8")), reason).toBe(true);
    }
  });
});

describe("letter spacing", () => {
  it("has one ladder, and it is the one in tailwind.config.ts", () => {
    const tracking = config.theme?.extend?.letterSpacing as Record<string, string> | undefined;
    expect(Object.keys(tracking ?? {})).toEqual([
      "body-mixed",
      "aetheria",
      "headline",
      "body-caps",
      "label",
      "micro",
      "micro-wide",
    ]);
  });

  it("has no arbitrary tracking values", () => {
    const offenders = sources.filter((f) => /tracking-\[/.test(readFileSync(f, "utf8")));
    expect(offenders, "use a letterSpacing token: tracking-label, tracking-micro").toEqual([]);
  });

  it("does not use stock tracking-widest alongside the ladder", () => {
    // Identical to tracking-headline. Two spellings of one value is the drift.
    const offenders = sources.filter((f) => /tracking-(widest|wider|tighter)/.test(readFileSync(f, "utf8")));
    expect(offenders, "use tracking-headline").toEqual([]);
  });
});
