// @vitest-environment node
//
// lib/motion.ts owns the curves. globals.css needs the same numbers as CSS
// strings and cannot import TypeScript, so this recomputes every line of that
// mirror from the module, and then fails on any bezier written by hand
// anywhere else.
//
// Before the module existed there were 14 hand-written beziers across 11
// files, in two spellings with no shared name: a [a,b,c,d] array for
// framer-motion and a cubic-bezier() string for CSS. Retuning the house curve
// meant editing eleven files and hoping you had found them all.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CLIP_REVEAL_TIMING,
  ENTRANCE_EASE,
  ENTRANCE_EASE_CSS,
  NAV_FRAME_EASE_CSS,
  PANEL_EASE,
  PANEL_EASE_CSS,
} from "../../lib/motion";

const css = readFileSync("app/globals.css", "utf8");
const EXTENSIONS = [".ts", ".tsx", ".css"];
const OWNERS = ["lib/motion.ts", "app/globals.css"];

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) found.push(full);
  }
  return found;
}

const sources = ["app", "components", "lib"]
  .flatMap((d) => walk(d))
  .filter((f) => !OWNERS.includes(f));

describe("easing curves", () => {
  it("keeps the two house curves distinct", () => {
    // The whole point of naming both is that an entrance and a response to a
    // click are not the same movement.
    expect(ENTRANCE_EASE).not.toEqual(PANEL_EASE);
  });

  it("renders the array and string forms from the same numbers", () => {
    expect(ENTRANCE_EASE_CSS).toBe(`cubic-bezier(${ENTRANCE_EASE.join(", ")})`);
    expect(PANEL_EASE_CSS).toBe(`cubic-bezier(${PANEL_EASE.join(", ")})`);
  });

  it("is mirrored into globals.css line for line", () => {
    expect(css).toContain(`--ease-entrance:      ${ENTRANCE_EASE_CSS};`);
    expect(css).toContain(`--ease-panel:         ${PANEL_EASE_CSS};`);
    expect(css).toContain(`--ease-nav-frame:     ${NAV_FRAME_EASE_CSS};`);
    expect(css).toContain(`--clip-reveal-timing: ${CLIP_REVEAL_TIMING};`);
  });

  it("is not written by hand anywhere else", () => {
    const offenders = sources.filter((f) => {
      const src = readFileSync(f, "utf8");
      return /cubic-bezier\s*\(/.test(src) || /\[\s*0?\.\d+\s*,\s*[01]\s*,\s*0?\.\d+\s*,\s*[01]\s*\]/.test(src);
    });
    expect(offenders, "import a curve from lib/motion.ts").toEqual([]);
  });
});
