// Instagram feed data layer.
//
// Currently uses static placeholder posts with local editorial photography.
// To connect a real feed, replace INSTAGRAM_POSTS with a fetch from one of:
//   - Behold.so  → https://behold.so  (no-code, token auto-refreshes)
//   - Instagram Basic Display API  → requires Facebook Developer app + OAuth
//
// The post shape below matches what both services return, so the section
// component won't need to change, only this data source does.

export type InstagramPost = {
  id: string;
  imageUrl: string;
  /** Short caption shown on hover. Keep under ~120 chars. */
  caption: string;
  /** Full Instagram post URL: links the tile when clicked. */
  permalink: string;
  /** Optional: rendered as subtle overlay on hover if present. */
  likes?: number;
};

// Placeholder: swap real Instagram posts here once the account is live.
// Handle: @merosvan (update INSTAGRAM_HANDLE below when confirmed)
export const INSTAGRAM_HANDLE = "@merosyogurt";
export const INSTAGRAM_URL = "https://instagram.com/merosyogurt";

export const INSTAGRAM_POSTS: InstagramPost[] = [
  {
    id: "1",
    imageUrl: "/images-web/Bowls/Tropic-2.jpg",
    caption: "The Tropics. Mango, pineapple, passion fruit, made in-house.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "3",
    imageUrl: "/images-web/Instagram/bowls/silk.png",
    caption: "Island berries. Vancouver Island, to be exact.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "4",
    imageUrl: "/images-web/Instagram/smoothies/crave.png",
    caption: "Raise the standard.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "5",
    imageUrl: "/images-web/Instagram/bowls/crunch.png",
    caption: "Yaletown's new obsession. Coming soon.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "6",
    imageUrl: "/images-web/Instagram/smoothies/tropic.png",
    caption: "The blend. No shortcuts.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "7",
    imageUrl: "/images-web/Instagram/bowls/focus.png",
    caption: "Recovery starts here.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "9",
    imageUrl: "/images-web/Instagram/bowls/moment.png",
    caption: "Your morning, upgraded.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "11",
    imageUrl: "/images-web/Instagram/bowls/cabana.png",
    caption: "Summer in a bowl.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "12",
    imageUrl: "/images-web/Instagram/smoothies/recovery.png",
    caption: "The comeback starts here.",
    permalink: INSTAGRAM_URL,
  },
];

// The footer's six tiles, named rather than sliced off the top of the feed, so
// which six show and in what order is one editable line instead of a
// consequence of the feed's authoring order. The homepage Instagram section
// still renders INSTAGRAM_POSTS as authored; only the footer picks.
//
// This lives beside the posts rather than in Footer.tsx, where it was until
// 2026-09-04. The lookup throws at module scope, so an id with no post behind
// it takes every page down at render; in a .tsx component no unit test could
// reach it and the failure surfaced only in `next build`. Here it is plain
// data and tests/unit/instagramFeed.test.ts checks it in two seconds.
//
// The Tropics shot is deliberately out: it reads as the retired Bloom, which
// is the same collision that retired the Bloom in the first place. Post "2"
// was The Rise and left with the item on 2026-09-04; post "12" (The Recovery)
// took its slot rather than the list shortening, so the five bowls and one
// smoothie stay in the same proportion. Every id here resolves to a photo in
// public/images-web/Instagram/.
export const FOOTER_POST_IDS = ["9", "12", "3", "4", "5", "7"] as const;

/**
 * The six posts, resolved. Lazy on purpose: resolving at module scope meant the
 * throw fired on import, which took down every page that renders a footer and
 * also made the failure unreachable from a unit test (the test file could not
 * import the module to assert against it). Resolved on first render instead,
 * and asserted cheaply by tests/unit/instagramFeed.test.ts.
 */
let footerPostsCache: InstagramPost[] | null = null;

export function footerInstagramPosts(): InstagramPost[] {
  footerPostsCache ??= FOOTER_POST_IDS.map((id) => {
    const post = INSTAGRAM_POSTS.find((p) => p.id === id);
    if (!post) throw new Error(`Footer feed: no Instagram post with id "${id}"`);
    return post;
  });
  return footerPostsCache;
}
