// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NAV_LINKS, FOOTER_DESTINATIONS } from "@/lib/nav";

// The nav menu and the footer are the only two indexes of where a visitor can
// go. They are hand-maintained lists in one file; this is what stops them
// drifting apart when a page is added to one and not the other.

describe("navigation", () => {
  it("gives every nav route a footer destination", () => {
    // "/" excepted: the footer's logo mark and the nav wordmark both go home,
    // so a "Home" line in the footer's large type would be a third way to say
    // the same thing.
    const routes = NAV_LINKS.map((l) => l.href).filter((href) => href !== "/");
    const footerHrefs = FOOTER_DESTINATIONS.map((l) => l.href);
    const missing = routes.filter((href) => !footerHrefs.includes(href));
    expect(missing, "nav routes with no footer destination").toEqual([]);
  });

  it("points every footer destination at a route or a home-page anchor", () => {
    const bad = FOOTER_DESTINATIONS.filter((l) => !/^\/($|[a-z]|#[a-z]+$)/.test(l.href));
    expect(bad.map((l) => l.href), "footer hrefs that are not site-root paths").toEqual([]);
  });

  it("repeats no label and no href in either list", () => {
    for (const [name, list] of [["nav", NAV_LINKS], ["footer", FOOTER_DESTINATIONS]] as const) {
      expect(new Set(list.map((l) => l.href)).size, `${name} hrefs`).toBe(list.length);
      expect(new Set(list.map((l) => l.label)).size, `${name} labels`).toBe(list.length);
    }
  });
});
