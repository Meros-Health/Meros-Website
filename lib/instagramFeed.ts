// Instagram feed data layer.
//
// Currently uses static placeholder posts with local editorial photography.
// To connect a real feed, replace INSTAGRAM_POSTS with a fetch from one of:
//   - Behold.so  → https://behold.so  (no-code, token auto-refreshes)
//   - Instagram Basic Display API  → requires Facebook Developer app + OAuth
//
// The post shape below matches what both services return, so the section
// component won't need to change — only this data source does.

export type InstagramPost = {
  id: string;
  imageUrl: string;
  /** Short caption shown on hover. Keep under ~120 chars. */
  caption: string;
  /** Full Instagram post URL — links the tile when clicked. */
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
    imageUrl: "/images-web/Instagram/bowls/bloom.png",
    caption: "Built different. Every bowl, made in-house.",
    permalink: INSTAGRAM_URL,
  },
  {
    id: "2",
    imageUrl: "/images-web/Instagram/smoothies/rise.png",
    caption: "The ritual. Greek yogurt, cold-strained, every morning.",
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
