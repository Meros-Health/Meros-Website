// The Content-Security-Policy in next.config.ts is an allowlist pinned to what
// the site loaded on the day it was written, while the site keeps changing
// underneath it. That gap is how the footer's Google Maps iframe sat inside a
// frame-src 'none' policy for three days: the audit that produced the policy
// read the rendered HTML of / and /checkout and filed google.com with
// maps.apple.com as a link target, which is true of an <a href> and false of an
// <iframe src>.
//
// So these tests are less about the header's current text than about keeping it
// and the markup from drifting apart again. They read next.config.ts as source,
// the same way tests/unit/catering.test.ts asserts there is no /wholesale.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");

/**
 * Line and block comments out, so an assertion reads the code's claims only.
 * Unlike the copies in catering.test.ts and canadianSpelling.test.ts this one
 * leaves a "//" that follows a colon alone, because those files never assert on
 * a URL and this one does: a naive stripper turns the frame-src directive into
 * "frame-src https:" and quietly passes every test written against it.
 */
const stripComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const RAW_CONFIG = readFileSync(join(ROOT, "next.config.ts"), "utf8");
const CONFIG = stripComments(RAW_CONFIG);

// The directive list as production resolves it: the one interpolation in it is
// the development carve-out, and "" is what production substitutes.
const PRODUCTION_CSP = CONFIG.slice(
  CONFIG.indexOf("const CSP = ["),
  CONFIG.indexOf('].join("; ")'),
).replace(/\$\{[^}]*\}/g, "");

/** One directive's value, as production sends it. */
function directive(name: string): string {
  const match = PRODUCTION_CSP.match(new RegExp("[\"`]" + name + " ([^\"`]+)[\"`]"));
  if (!match) throw new Error(`next.config.ts has no ${name} directive`);
  return match[1].trim();
}

const SOURCE_DIRS = ["app", "components"];
const EXTENSIONS = [".ts", ".tsx"];

function walk(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, found);
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) found.push(full);
  }
  return found;
}

const SOURCES = SOURCE_DIRS.flatMap((d) => walk(join(ROOT, d))).map((file) => ({
  path: file.slice(ROOT.length + 1),
  code: stripComments(readFileSync(file, "utf8")),
}));

const filesMatching = (pattern: RegExp) =>
  SOURCES.filter((f) => pattern.test(f.code)).map((f) => f.path);

describe("the policy is enforced", () => {
  it("sends Content-Security-Policy, not Content-Security-Policy-Report-Only", () => {
    expect(CONFIG).toContain('{ key: "Content-Security-Policy", value: CSP }');
    expect(CONFIG).not.toContain("Content-Security-Policy-Report-Only");
  });

  it("sends exactly one Content-Security-Policy header", () => {
    // Two CSP headers on one response intersect rather than merge, so a second
    // one repeating frame-ancestors is a sharp edge for no gain. The standalone
    // header existed only while the full policy was report-only.
    expect(CONFIG.match(/key: "Content-Security-Policy"/g) ?? []).toHaveLength(1);
  });
});

describe("the development carve-out stays out of production", () => {
  it("gates 'unsafe-eval' on NODE_ENV", () => {
    // next dev compiles every module through webpack's eval devtool, and
    // 'unsafe-inline' does not permit eval. The production bundle has no eval.
    expect(CONFIG).toContain('const isDev = process.env.NODE_ENV === "development"');
    expect(RAW_CONFIG).toMatch(/isDev \? " 'unsafe-eval'" : ""/);
    expect(directive("script-src")).toBe("'self' 'unsafe-inline'");
  });

  it("keeps upgrade-insecure-requests in production only", () => {
    expect(RAW_CONFIG).toMatch(/isDev \? \[\] : \["upgrade-insecure-requests"\]/);
  });
});

describe("the policy has not drifted from the markup", () => {
  it("allows a frame source if and only if something renders a frame", () => {
    const framing = filesMatching(/<iframe[\s>]/);
    const frameSrc = directive("frame-src");

    if (framing.length === 0) {
      expect(frameSrc, "nothing renders an iframe, so frame-src should be 'none'").toBe("'none'");
      return;
    }

    expect(frameSrc, `${framing.join(", ")} render an iframe`).not.toBe("'none'");
    // And nothing is allowed that no longer frames anything. If the footer map
    // is ever removed, this fails rather than leaving a stale allowance behind.
    const framingCode = framing.map((p) => SOURCES.find((f) => f.path === p)!.code).join("\n");
    for (const host of frameSrc.split(/\s+/).filter((h) => h.startsWith("https://"))) {
      expect(framingCode, `frame-src allows ${host} but nothing frames it`).toContain(host);
    }
  });

  it("allows no object or embed source, because nothing renders one", () => {
    expect(filesMatching(/<(object|embed)[\s>]/)).toEqual([]);
    expect(directive("object-src")).toBe("'none'");
  });

  it("allows blob: images only if something can make a blob URL", () => {
    // blob: was in the first draft defensively. Nothing calls createObjectURL,
    // there is no upload and no canvas, so the allowance was dead.
    const makers = filesMatching(/createObjectURL|new Blob\(|toDataURL/);
    const imgSrc = directive("img-src");
    if (makers.length === 0) expect(imgSrc).not.toContain("blob:");
    else expect(imgSrc, `${makers.join(", ")} can make a blob URL`).toContain("blob:");
  });

  it("allows no client-side network destination beyond this origin", () => {
    // Both server actions are called as functions after preventDefault, which
    // makes them RSC POSTs on this origin. A client-side fetch anywhere else
    // would need connect-src widened, and that should be a deliberate decision.
    const callers = SOURCES.filter(
      (f) => /"use client"/.test(f.code) && /\bfetch\(|new WebSocket\(|sendBeacon\(/.test(f.code),
    ).map((f) => f.path);
    expect(callers).toEqual([]);
    expect(directive("connect-src")).toBe("'self'");
  });
});
