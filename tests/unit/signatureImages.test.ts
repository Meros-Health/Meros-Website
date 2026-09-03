// @vitest-environment node
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Brand constraint: signature art is never squeezed on one axis. A mail
// client draws an <img> at exactly the width and height its tag carries, so
// the tag has to match the file's own aspect ratio, with at most one axis
// rounded to a whole pixel.

const ROOT = join(__dirname, "..", "..");
const ASSET_DIR = join(ROOT, "public", "signature");
const PAGES = [
  ...readdirSync(ASSET_DIR).filter((f) => f.endsWith(".html")).map((f) => join(ASSET_DIR, f)),
  join(ROOT, "docs", "brand", "email-signature.html"),
];

function pngSize(file: string): { w: number; h: number } {
  const buf = readFileSync(file);
  expect(buf.subarray(1, 4).toString(), `${file} is a PNG`).toBe("PNG");
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const IMG = /<img\b[^>]*>/g;
const attr = (tag: string, name: string) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

describe("signature images", () => {
  for (const page of PAGES) {
    it(`${page.replace(ROOT + "/", "")} sizes every image to its file's aspect ratio`, () => {
      const html = readFileSync(page, "utf8");
      const tags = html.match(IMG) ?? [];
      expect(tags.length, "images on the page").toBeGreaterThan(0);
      for (const tag of tags) {
        const src = attr(tag, "src") ?? "";
        const m = src.match(/^https:\/\/merosyogurt\.com\/signature\/([^/"]+)$/);
        expect(m, `${src} is an absolute /signature/ URL`).not.toBeNull();
        const file = join(ASSET_DIR, m![1]);
        const { w, h } = pngSize(file);
        const W = Number(attr(tag, "width"));
        const H = Number(attr(tag, "height"));
        expect(W > 0 && H > 0, `${m![1]} carries width and height`).toBe(true);
        // One axis sets the size; the other must be that axis scaled by the
        // file's ratio and rounded to a whole pixel. Anything else is a squeeze.
        const okByWidth = H === Math.round((W * h) / w);
        const okByHeight = W === Math.round((H * w) / h);
        expect(
          okByWidth || okByHeight,
          `${m![1]} is ${w}x${h}; tag ${W}x${H} squeezes it (at ${W} wide expect height ${Math.round((W * h) / w)})`,
        ).toBe(true);
      }
    });
  }
});
