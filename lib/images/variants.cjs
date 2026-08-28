// Contract between the three parties in the image pipeline:
//   scripts/build-images.mjs  renders every width listed here into public/img,
//   next.config.ts            hands the same widths to next/image as srcset candidates,
//   lib/imageLoader.ts        turns a (src, width) request into the rendered file.
// Keeping widths and naming in one module means the three cannot disagree. It
// is CommonJS because next.config.ts is loaded with require() and the build
// script is native ESM; a .cjs file is the one format both can import.

/** Widths next/image offers for fixed-size images (icons, thumbnails). */
const IMAGE_SIZES = [64, 128, 256, 384];
/** Widths next/image offers for viewport-relative images (`sizes` with vw). */
const DEVICE_SIZES = [640, 828, 1080, 1440, 1920];
const ALL_WIDTHS = [...IMAGE_SIZES, ...DEVICE_SIZES];

/** Public path the rendered variants are served from. */
const VARIANT_DIR = "/img";

/**
 * Bump when scripts/build-images.mjs changes how it encodes. It is folded into
 * every source's content hash, so a settings change re-renders every variant
 * under a new name instead of leaving stale encodes behind a matching name.
 */
const ENCODER_VERSION = 2;

/**
 * Widths rendered for a source of the given pixel width: every candidate the
 * source can supply without upscaling. A source narrower than the smallest
 * candidate is rendered once, at its own width.
 * @param {number} sourceWidth
 * @returns {number[]}
 */
function variantWidthsFor(sourceWidth) {
  const widths = ALL_WIDTHS.filter((w) => w <= sourceWidth);
  return widths.length > 0 ? widths : [sourceWidth];
}

/**
 * Served path of one variant. The content hash is in the name so the file can
 * carry a one-year immutable cache header: a replaced photo gets a new name,
 * a stale browser cache can never show the old one.
 * @param {string} src   public path of the source, e.g. "/images-web/Bowls/Silk-1.jpg"
 * @param {string} hash  short content hash of the source bytes
 * @param {number} width rendered width
 * @returns {string}
 */
function variantPath(src, hash, width) {
  const slash = src.lastIndexOf("/");
  const dot = src.lastIndexOf(".");
  const stem = dot > slash ? src.slice(0, dot) : src;
  return `${VARIANT_DIR}${stem}.${hash}-${width}.webp`;
}

module.exports = { IMAGE_SIZES, DEVICE_SIZES, ALL_WIDTHS, VARIANT_DIR, ENCODER_VERSION, variantWidthsFor, variantPath };
