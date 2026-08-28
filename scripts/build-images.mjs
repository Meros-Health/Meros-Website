#!/usr/bin/env node
// Renders responsive WebP variants of every image under public/images-web and
// public/logos into public/img, and writes lib/images/manifest.json so the
// next/image loader knows what exists. Runs before `next dev` and `next build`.
//
// Why build-time rather than on demand: Next's image optimizer is a no-op on
// Cloudflare Workers, so /_next/image served the untouched originals (1.6 MB
// PNGs at 64px). Rendering ahead of time is free, deterministic, and produces
// the same bytes in dev, e2e and production.
//
// Incremental: a variant is skipped when its file already exists, and the file
// name carries the source's content hash, so a changed photo renders fresh and
// the stale files are pruned at the end.

import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const require = createRequire(import.meta.url);
const { VARIANT_DIR, ENCODER_VERSION, variantWidthsFor, variantPath } = require("../lib/images/variants.cjs");

const ROOT = path.resolve(import.meta.dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SOURCE_DIRS = ["images-web", "logos"];
const OUT_DIR = path.join(PUBLIC_DIR, VARIANT_DIR.slice(1));
const MANIFEST_PATH = path.join(ROOT, "lib", "images", "manifest.json");
const SOURCE_EXT = /\.(png|jpe?g)$/i;
const CONCURRENCY = 4; // sources in flight; libvips threads inside each

// Encoding per source kind. Photos are lossy at a quality that is visually
// transparent for food photography; the two largest widths only ever serve
// 3x phones, where the extra pixels hide compression far better than bytes
// on cellular are hidden. Product cut-outs keep a high alpha quality so the
// edges stay clean over the cream. Logos are lossless: they are small, and
// lossy WebP softens type.
function webpOptions(src, hasAlpha, width) {
  if (src.startsWith("/logos/")) return { lossless: true, effort: 4 };
  if (hasAlpha) return { quality: 82, alphaQuality: 90, effort: 4 };
  return { quality: width >= 1440 ? 70 : 80, effort: 4 };
}

async function listSources() {
  const files = [];
  for (const dir of SOURCE_DIRS) {
    const base = path.join(PUBLIC_DIR, dir);
    const entries = await fs.readdir(base, { recursive: true, withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !SOURCE_EXT.test(entry.name)) continue;
      const abs = path.join(entry.parentPath ?? entry.path, entry.name);
      files.push({ abs, src: "/" + path.relative(PUBLIC_DIR, abs).split(path.sep).join("/") });
    }
  }
  return files.sort((a, b) => a.src.localeCompare(b.src));
}

async function describe(file) {
  const buffer = await fs.readFile(file.abs);
  // Same formula as tests/unit/imageManifest.test.ts. Bump ENCODER_VERSION in
  // variants.cjs when the encoding changes; see the note there.
  const hash = createHash("sha1").update(buffer).update(`v${ENCODER_VERSION}`).digest("hex").slice(0, 8);
  const meta = await sharp(buffer).metadata();
  // EXIF orientation 5..8 rotates by 90 degrees, so displayed width and height swap.
  const rotated = (meta.orientation ?? 1) >= 5;
  const width = rotated ? meta.height : meta.width;
  const height = rotated ? meta.width : meta.height;
  if (!width || !height) throw new Error(`Could not read dimensions of ${file.src}`);
  return { ...file, buffer, hash, width, height, hasAlpha: Boolean(meta.hasAlpha) };
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function render(source, stats) {
  const outputs = [];
  for (const width of variantWidthsFor(source.width)) {
    const options = webpOptions(source.src, source.hasAlpha, width);
    const rel = variantPath(source.src, source.hash, width);
    const abs = path.join(PUBLIC_DIR, rel.slice(1));
    outputs.push(abs);
    if (await exists(abs)) {
      stats.skipped += 1;
      continue;
    }
    await fs.mkdir(path.dirname(abs), { recursive: true });
    const info = await sharp(source.buffer)
      .rotate() // bake EXIF orientation in; browsers do not all honour it in srcset
      .resize({ width, withoutEnlargement: true })
      .webp(options)
      .toFile(abs);
    stats.written += 1;
    stats.bytes += info.size;
  }
  return outputs;
}

async function pool(items, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, run));
  return results;
}

async function prune(keep) {
  if (!(await exists(OUT_DIR))) return 0;
  let removed = 0;
  const entries = await fs.readdir(OUT_DIR, { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const abs = path.join(entry.parentPath ?? entry.path, entry.name);
    if (keep.has(abs)) continue;
    await fs.rm(abs);
    removed += 1;
  }
  // Drop directories left empty by the prune, deepest first.
  const dirs = (await fs.readdir(OUT_DIR, { recursive: true, withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => path.join(e.parentPath ?? e.path, e.name))
    .sort((a, b) => b.length - a.length);
  for (const dir of dirs) {
    if ((await fs.readdir(dir)).length === 0) await fs.rmdir(dir);
  }
  return removed;
}

async function main() {
  const started = Date.now();
  const files = await listSources();
  const sources = await pool(files, describe);
  const stats = { written: 0, skipped: 0, bytes: 0 };
  const keep = new Set();
  await pool(sources, async (source) => {
    for (const out of await render(source, stats)) keep.add(out);
  });
  const removed = await prune(keep);

  const images = {};
  for (const s of sources) images[s.src] = { hash: s.hash, width: s.width, height: s.height };
  const manifest = { images };
  const json = JSON.stringify(manifest, null, 2) + "\n";
  const previous = (await exists(MANIFEST_PATH)) ? await fs.readFile(MANIFEST_PATH, "utf8") : "";
  if (previous !== json) await fs.writeFile(MANIFEST_PATH, json);

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(
    `[images] ${sources.length} sources, ${keep.size} variants ` +
      `(${stats.written} written, ${stats.skipped} up to date, ${removed} pruned) ` +
      `in ${seconds}s${previous !== json ? ", manifest updated" : ""}`
  );
}

main().catch((error) => {
  console.error("[images] failed:", error);
  process.exit(1);
});
