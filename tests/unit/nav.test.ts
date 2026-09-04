// @vitest-environment node
import { describe, expect, it } from "vitest";
import { NAV_LINKS, FOOTER_DESTINATIONS } from "@/lib/nav";

// The nav menu and the footer are the only two indexes of where a visitor can
// go. The footer's Go column used to be a second hand-maintained copy of the
// nav and this file existed to catch them drifting apart; it is now an alias,
// so the first test guards that relationship instead of the symptom.

describe("navigation", () => {
  it("gives the footer the same destinations as the nav, by identity", () => {
    // Not a deep equality check: the point is that there is one array. If a
    // future footer genuinely needs to diverge, this is the test to change,
    // and changing it is the moment to write down why.
    expect(FOOTER_DESTINATIONS).toBe(NAV_LINKS);
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
