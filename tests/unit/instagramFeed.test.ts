import { describe, expect, it } from "vitest";
import { INSTAGRAM_POSTS } from "@/lib/instagramFeed";
import { listBowls, listSmoothies } from "@/lib/menu/signatures";

// H7-07: the feed is hand-written; it must not show a bowl the menu retired.
describe("instagram feed", () => {
  it("shows no retired item", () => {
    const current = new Set([...listBowls(), ...listSmoothies()].map((i) => i.id));
    for (const post of INSTAGRAM_POSTS) {
      const slug = post.imageUrl.split("/").pop()!.split(".")[0].toLowerCase();
      // Gallery and lifestyle shots carry no item slug; item shots must be current.
      if (["bloom"].includes(slug)) throw new Error(`${post.imageUrl} shows a retired item`);
      if (/^(moment|silk|crunch|tropic|seasonal|rise|crave|focus|cabana|recovery)/.test(slug)) {
        expect(current.has(slug.replace(/-\d+$/, "")), post.imageUrl).toBe(true);
      }
    }
  });
});
