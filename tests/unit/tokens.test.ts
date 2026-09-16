// The palette has one owner (lib/design/colors.ts) and one mirror
// (app/globals.css, which cannot import TypeScript). These tests are what bind
// the two together, and what stops a sixth spelling of a brand colour from
// appearing in a component the way 56 of them did before.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import config from "../../tailwind.config";
import { ALPHA, BRAND, withAlpha } from "../../lib/design/colors";
import { NAV_BAR_HEIGHT_PX } from "../../lib/design/layout";

const colors = (config.theme?.extend?.colors ?? {}) as Record<string, string>;
const css = readFileSync("app/globals.css", "utf8");

function luminance(hex: string): number {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("colour tokens", () => {
  it("tailwind reads its palette from the module that owns it", () => {
    expect(colors).toBe(BRAND);
  });

  it("every brand colour is a six-digit hex", () => {
    for (const [name, value] of Object.entries(BRAND)) {
      expect(value, name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("grapefruit-text on cream clears AA for small text (4.5:1)", () => {
    expect(contrast(BRAND["grapefruit-text"], BRAND.cream)).toBeGreaterThanOrEqual(4.5);
  });

  it("midnight on cream clears AAA (7:1)", () => {
    expect(contrast(BRAND.midnight, BRAND.cream)).toBeGreaterThanOrEqual(7);
  });

  it("brand grapefruit on midnight, as the Stacks section uses it, clears AA", () => {
    expect(contrast(BRAND.grapefruit, BRAND.midnight)).toBeGreaterThanOrEqual(4.5);
  });

  it("every staff status colour on cream clears AA for small text (4.5:1)", () => {
    // The /staff board's chip labels are 12px, so 1.4.3 small-text AA applies.
    for (const name of ["status-in", "status-low", "status-out"] as const) {
      expect(contrast(BRAND[name], BRAND.cream), name).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("blue clears the 3:1 non-text minimum on midnight, its only ground", () => {
    // A macro ring and a Stacks ring, never type, so WCAG 1.4.11 applies
    // rather than 1.4.3. It had no assertion at all before it became a token.
    expect(contrast(BRAND.blue, BRAND.midnight)).toBeGreaterThanOrEqual(3);
  });
});

describe("the CSS mirror", () => {
  it("declares every brand colour with the same hex", () => {
    for (const [name, value] of Object.entries(BRAND)) {
      const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"));
      expect(m, `--color-${name} is missing from globals.css`).not.toBeNull();
      expect(m?.[1].toLowerCase(), name).toBe(value.toLowerCase());
    }
  });

  it("declares no brand colour the module does not own", () => {
    const declared = [...css.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1]);
    for (const name of declared) {
      expect(Object.keys(BRAND), `--color-${name} has no entry in BRAND`).toContain(name);
    }
  });

  it("composes every alpha token from the palette and the alpha scale", () => {
    const composed = [...css.matchAll(/--(rule-strong|veil|rule|scrim)-([a-z-]+):\s*([^;]+);/g)];
    expect(composed.length).toBeGreaterThan(0);
    for (const [, alphaName, colorName, value] of composed) {
      const hex = BRAND[colorName as keyof typeof BRAND];
      expect(hex, `--${alphaName}-${colorName} names a colour that is not in BRAND`).toBeDefined();
      const alpha = ALPHA[alphaName as keyof typeof ALPHA];
      expect(value.trim()).toBe(withAlpha(hex, alpha));
    }
  });

  it("declares the nav bar height that lib/design/layout.ts owns", () => {
    // Navbar draws the band at this height and the hero reserves it as
    // padding, so a mismatch puts the hero's first row under the bar.
    expect(css).toContain(`--nav-bar-height:     ${NAV_BAR_HEIGHT_PX}px;`);
  });

  it("ties the hero's hold to the nav bar height", () => {
    // The sticky hero releases when the menu's top edge meets the bottom of
    // the nav band. That moment is computed from the token, so a nav that
    // changes height moves the release with it rather than leaving a strip of
    // photograph showing under the bar.
    const curtain = css.match(/\.hero-curtain\s*\{[^}]*\}/)?.[0];
    expect(curtain, ".hero-curtain rule missing from globals.css").toBeDefined();
    expect(curtain).toContain("--hero-hold: calc(100svh - var(--nav-bar-height)");
    expect(curtain).toContain("margin-bottom: calc(-1 * var(--hero-hold))");
  });

  it("composes the two quiet-ink levels from the palette", () => {
    // Deliberately not on the four-step alpha scale: the same perceived
    // quietness needs a different alpha dark-on-light than light-on-dark.
    expect(css).toContain(`--gallery-ink-quiet: ${withAlpha(BRAND.midnight, 0.62)};`);
    expect(css).toContain(`--gallery-ink-quiet: ${withAlpha(BRAND.cream, 0.66)};`);
  });
});

describe("no hand-written brand colours", () => {
  // The palette module owns the hexes. globals.css is the CSS mirror and is
  // bound to it by the tests above; nothing else may spell a brand colour.
  const OWNERS = ["lib/design/colors.ts", "app/globals.css"];
  const EXTENSIONS = [".ts", ".tsx", ".css"];

  function walk(dir: string, found: string[] = []): string[] {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, found);
      } else if (EXTENSIONS.some((e) => entry.endsWith(e))) {
        found.push(full);
      }
    }
    return found;
  }

  const sources = ["app", "components", "lib", "store"]
    .flatMap((d) => walk(d))
    .filter((f) => !OWNERS.includes(f));

  const triples = Object.values(BRAND)
    .map((hex) => {
      const c = hex.replace("#", "");
      return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16)).join(",\\s*");
    })
    .join("|");
  const rgbLiteral = new RegExp(`rgba?\\(\\s*(?:${triples})`, "i");
  const hexLiteral = new RegExp(Object.values(BRAND).join("|"), "i");

  it("finds source files to scan", () => {
    expect(sources.length).toBeGreaterThan(50);
  });

  it.each(["rgb", "hex"] as const)("uses no raw brand %s anywhere else", (kind) => {
    const pattern = kind === "rgb" ? rgbLiteral : hexLiteral;
    const offenders = sources.filter((f) => pattern.test(readFileSync(f, "utf8")));
    expect(offenders, "use a token: a Tailwind class, a CSS var, or BRAND/withAlpha").toEqual([]);
  });

  it("references no alpha token globals.css does not declare", () => {
    const declared = new Set(
      [...css.matchAll(/--((?:rule-strong|veil|rule|scrim)-[a-z-]+):/g)].map((m) => m[1]),
    );
    const used = new Map<string, string>();
    for (const f of sources) {
      for (const m of readFileSync(f, "utf8").matchAll(
        /var\(--((?:rule-strong|veil|rule|scrim)-[a-z-]+)\)/g,
      )) {
        used.set(m[1], f);
      }
    }
    for (const [token, file] of used) {
      expect(declared, `${file} uses --${token}, which globals.css does not declare`).toContain(token);
    }
  });
});
