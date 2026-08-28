import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/lib/images/manifest.json";
import imageLoader from "@/lib/imageLoader";
import { ENCODER_VERSION, variantPath, variantWidthsFor } from "@/lib/images/variants.cjs";

// The image pipeline has three parts that must agree: the sources on disk,
// lib/images/manifest.json, and the rendered variants under public/img. Any
// drift means the loader hands next/image a path that 404s or falls back to
// the multi-megabyte original. `npm run images` regenerates all of it.

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SOURCE_ROOTS = ["app", "components", "lib"];
const SOURCE_FILE = /\.(tsx?|json)$/;
const IMAGE_LITERAL = /"(\/(?:images-web|logos)\/[^"]+\.(?:png|jpe?g))"/g;
const HINT = "Run `npm run images` and commit lib/images/manifest.json.";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, out);
    else if (SOURCE_FILE.test(entry.name)) out.push(abs);
  }
  return out;
}

function referencedImages(): string[] {
  const found = new Set<string>();
  for (const root of SOURCE_ROOTS) {
    for (const file of walk(path.join(ROOT, root))) {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(IMAGE_LITERAL)) found.add(match[1]);
    }
  }
  return [...found].sort();
}

const entries = Object.entries(manifest.images);

describe("image manifest", () => {
  it("covers every image path referenced in app, components and lib", () => {
    const missing = referencedImages().filter((src) => !(src in manifest.images));
    expect(missing, `Not in manifest: ${missing.join(", ")}. ${HINT}`).toEqual([]);
  });

  it("matches the source files on disk byte for byte", () => {
    const stale: string[] = [];
    for (const [src, entry] of entries) {
      const abs = path.join(PUBLIC_DIR, src.slice(1));
      if (!existsSync(abs)) {
        stale.push(`${src} (source missing)`);
        continue;
      }
      // Same formula as scripts/build-images.mjs.
      const hash = createHash("sha1")
        .update(readFileSync(abs))
        .update(`v${ENCODER_VERSION}`)
        .digest("hex")
        .slice(0, 8);
      if (hash !== entry.hash) stale.push(`${src} (source changed)`);
    }
    expect(stale, `Manifest out of date: ${stale.join(", ")}. ${HINT}`).toEqual([]);
  });

  it("has a rendered variant for every width the loader can return", () => {
    const missing: string[] = [];
    for (const [src, entry] of entries) {
      for (const width of variantWidthsFor(entry.width)) {
        const rel = variantPath(src, entry.hash, width);
        const abs = path.join(PUBLIC_DIR, rel.slice(1));
        if (!existsSync(abs) || statSync(abs).size === 0) missing.push(rel);
      }
    }
    expect(missing.slice(0, 5), `${missing.length} variants missing. ${HINT}`).toEqual([]);
  });
});

describe("imageLoader", () => {
  it("snaps a requested width up to the next rendered candidate", () => {
    const [src, entry] = entries.find(([, e]) => e.width >= 1920)!;
    expect(imageLoader({ src, width: 700 })).toBe(variantPath(src, entry.hash, 828));
    expect(imageLoader({ src, width: 64 })).toBe(variantPath(src, entry.hash, 64));
  });

  it("never upscales: widths past the source clamp to the largest variant", () => {
    const [src, entry] = entries.find(([, e]) => e.width < 1920)!;
    const largest = variantWidthsFor(entry.width).at(-1)!;
    expect(imageLoader({ src, width: 3840 })).toBe(variantPath(src, entry.hash, largest));
  });

  it("leaves unknown sources untouched rather than inventing a path", () => {
    expect(imageLoader({ src: "/not-a-real/image.png", width: 640 })).toBe("/not-a-real/image.png");
  });
});
