// Colour tokens hold their contrast. The brand grapefruit is a fill and border
// colour; copy set in grapefruit uses the darker text token so small text on
// cream clears WCAG AA (4.5:1). Read from tailwind.config.ts so the test fails
// the moment a token is retuned past the line.
import { describe, expect, it } from "vitest";
import config from "../../tailwind.config";

const colors = (config.theme?.extend?.colors ?? {}) as Record<string, string>;

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
  it("defines the four brand colours and the copy grapefruit", () => {
    for (const name of ["cream", "midnight", "juniper", "grapefruit", "grapefruit-text"]) {
      expect(colors[name], name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("grapefruit-text on cream clears AA for small text (4.5:1)", () => {
    expect(contrast(colors["grapefruit-text"], colors.cream)).toBeGreaterThanOrEqual(4.5);
  });

  it("midnight on cream clears AAA (7:1)", () => {
    expect(contrast(colors.midnight, colors.cream)).toBeGreaterThanOrEqual(7);
  });

  it("brand grapefruit on midnight, as the Stacks section uses it, clears AA", () => {
    expect(contrast(colors.grapefruit, colors.midnight)).toBeGreaterThanOrEqual(4.5);
  });

  it("the CSS custom property matches the Tailwind token", async () => {
    const fs = await import("node:fs");
    const css = fs.readFileSync("app/globals.css", "utf8");
    const m = css.match(/--color-grapefruit-text:\s*(#[0-9a-f]{6})/i);
    expect(m?.[1].toLowerCase()).toBe(colors["grapefruit-text"].toLowerCase());
  });
});
