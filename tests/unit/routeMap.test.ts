// @vitest-environment node
import { readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { SITE_URL } from "@/lib/config";

// The sitemap and robots.txt are hand-maintained lists; the route tree under
// app/ is what actually exists. They agreed on the day of the cutover. This
// makes the agreement a build failure the first time a route is added without
// a sitemap entry, or an entry outlives its route.

const APP_DIR = path.resolve(__dirname, "../../app");

// Every route that renders a page, as its URL path. Route groups "(name)" add
// no segment; dynamic segments keep their brackets so they can be told apart.
function pageRoutes(dir = APP_DIR, prefix = ""): string[] {
  const routes: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name === "page.tsx") routes.push(prefix || "/");
    if (!entry.isDirectory()) continue;
    const segment = /^\(.+\)$/.test(entry.name) ? "" : `/${entry.name}`;
    routes.push(...pageRoutes(path.join(dir, entry.name), prefix + segment));
  }
  return routes.sort();
}

function disallowedPrefixes(): string[] {
  const rules = robots().rules;
  const list = Array.isArray(rules) ? rules : [rules];
  return list.flatMap((rule) => {
    const d = rule.disallow ?? [];
    return Array.isArray(d) ? d : [d];
  });
}

const isDisallowed = (route: string, prefixes: string[]) =>
  prefixes.some((p) => route === p || route.startsWith(p.endsWith("/") ? p : `${p}/`));

const isDynamic = (route: string) => route.includes("[");

describe("route map", () => {
  const routes = pageRoutes();
  const prefixes = disallowedPrefixes();
  const listed = sitemap().map((entry) => {
    expect(entry.url.startsWith(SITE_URL), `${entry.url} is not on ${SITE_URL}`).toBe(true);
    return entry.url.slice(SITE_URL.length) || "/";
  });

  it("lists every public static route in the sitemap", () => {
    const publicRoutes = routes.filter((r) => !isDynamic(r) && !isDisallowed(r, prefixes));
    const missing = publicRoutes.filter((r) => !listed.includes(r));
    expect(missing, "public routes absent from app/sitemap.ts").toEqual([]);
  });

  it("has a page for every sitemap entry", () => {
    const orphaned = listed.filter((r) => !routes.includes(r));
    expect(orphaned, "sitemap entries with no app/**/page.tsx").toEqual([]);
  });

  it("keeps disallowed routes out of the sitemap", () => {
    const leaked = listed.filter((r) => isDisallowed(r, prefixes));
    expect(leaked, "robots.txt disallows these but the sitemap advertises them").toEqual([]);
  });

  it("disallows every dynamic route, since it cannot be listed", () => {
    const unguarded = routes.filter((r) => isDynamic(r) && !isDisallowed(r, prefixes));
    expect(unguarded, "dynamic routes neither in the sitemap nor disallowed").toEqual([]);
  });
});
