#!/usr/bin/env node
// One-off, committed outputs: the icon set and the link-preview image, so
// every browser, crawler and share sheet gets an asset made for its role
// instead of a 1376px logo for all of them. Re-run when the logo or the
// hero photo changes: `node scripts/build-icons.mjs`.

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const LOGO = path.join(ROOT, "public/logos/logo-terracotta.png");
const OG_SOURCE = path.join(ROOT, "public/images-web/Hero/Gallery-8-hero-web.jpg");
const CREAM = { r: 255, g: 247, b: 240, alpha: 1 };

const png = (size, opaque = false) => {
  const pipeline = sharp(LOGO).resize(size, size, { fit: "cover" });
  // iOS paints transparent corners black; give the touch icon a cream ground.
  return (opaque ? pipeline.flatten({ background: CREAM }) : pipeline).png().toBuffer();
};

// ICO container holding PNG-encoded frames (supported by every browser that
// still asks for favicon.ico, and by Windows since Vista).
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(16 * frames.length);
  let offset = header.length + dir.length;
  frames.forEach(({ size, data }, i) => {
    const entry = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, entry);
    dir.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    dir.writeUInt8(0, entry + 2); // palette
    dir.writeUInt8(0, entry + 3); // reserved
    dir.writeUInt16LE(1, entry + 4); // planes
    dir.writeUInt16LE(32, entry + 6); // bits per pixel
    dir.writeUInt32LE(data.length, entry + 8);
    dir.writeUInt32LE(offset, entry + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.data)]);
}

async function write(rel, data) {
  const abs = path.join(ROOT, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
  console.log(`${rel.padEnd(34)} ${Math.round(data.length / 1024)} KB`);
}

const frames = await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png(size) })));
await write("app/favicon.ico", ico(frames));
await write("app/icon.png", await png(512));
await write("app/apple-icon.png", await png(180, true));
// Old clients request this exact path without looking for a link tag.
await write("public/apple-touch-icon.png", await png(180, true));
await write("public/icons/icon-192.png", await png(192));
await write("public/icons/icon-512.png", await png(512));

// Link preview: 1200x630 is the size every platform renders without cropping.
// Centre crop of the hero photo; the bowls sit mid-frame so nothing important
// is lost to the 3:2 to 1.9:1 change.
await write(
  "public/og/meros.jpg",
  await sharp(OG_SOURCE).resize(1200, 630, { fit: "cover", position: "centre" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
);
