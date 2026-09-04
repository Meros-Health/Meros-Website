import { describe, expect, it } from "vitest";
import { INSTAGRAM_POSTS, FOOTER_POST_IDS, footerInstagramPosts } from "@/lib/instagramFeed";
import { listBowls, listSmoothies } from "@/lib/menu/signatures";

// H7-07: the feed is hand-written; it must not show a bowl the menu retired.
describe("instagram feed", () => {
  it("shows no retired item", () => {
    const current = new Set([...listBowls(), ...listSmoothies()].map((i) => i.id));
    for (const post of INSTAGRAM_POSTS) {
      const slug = post.imageUrl.split("/").pop()!.split(".")[0].toLowerCase();
      // Gallery and lifestyle shots carry no item slug; item shots must be current.
      if (["bloom", "rise"].includes(slug)) throw new Error(`${post.imageUrl} shows a retired item`);
      if (/^(moment|silk|crunch|tropic|seasonal|crave|focus|cabana|recovery|glow|garden)/.test(slug)) {
        expect(current.has(slug.replace(/-\d+$/, "")), post.imageUrl).toBe(true);
      }
    }
  });
});

// The footer names its six tiles by post id and throws at module scope if one
// is missing, so a post removed from the feed takes the whole site down at
// render rather than failing anywhere cheaper. That is exactly what happened
// when The Rise was retired on 2026-09-04: lint, typecheck and every test
// passed, and the build died prerendering /menu. The list moved out of
// Footer.tsx so this check could exist at all.
describe("the footer's six tiles", () => {
  it("names six posts that are all still in the feed", () => {
    const ids = new Set(INSTAGRAM_POSTS.map((p) => p.id));
    const missing = FOOTER_POST_IDS.filter((id) => !ids.has(id));
    expect(missing, "footer ids with no post behind them").toEqual([]);
    expect(FOOTER_POST_IDS.length).toBe(6);
    expect(new Set(FOOTER_POST_IDS).size, "a tile named twice").toBe(6);
    expect(() => footerInstagramPosts()).not.toThrow();
  });
});
