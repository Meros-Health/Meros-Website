# Meros — House of Yogurt

Marketing and build-your-own-bowl ordering site. Opening Yaletown, Vancouver — late July/early August 2026.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | RSC + streaming |
| Language | TypeScript (strict) | |
| Styling | Tailwind CSS | Design token–driven, brand config in `tailwind.config.ts` |
| Primary scroll animation | GSAP + ScrollTrigger + `@gsap/react` | Scroll-locked pinned sections, frame-sequence scrubbing |
| Smooth scroll | Lenis (studio-freight) | Virtualised scroll, bridged to GSAP ticker (see below) |
| Micro-interactions | Framer Motion | Secondary only — not used for primary scroll sequences |
| Cart state | Zustand + persist | localStorage-backed, auth-ready via `partialize` |
| Deploy | Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`) | `npm run deploy`; config in `wrangler.jsonc` |

## Routes

- `/` — Landing page
- `/build` — Build-your-own-bowl configurator (stateful, live price calc)
- `/order` — Full menu (smoothies, bowls, etc.) ordering page. Cart review lives at the bottom (`#cart`); checkout button is visibly disabled ("Coming Soon") — no payment integration yet

## Animation Architecture

### Lenis ↔ GSAP ScrollTrigger bridge

`components/animation/LenisProvider.tsx` runs Lenis inside `gsap.ticker` (not a separate `rAF`) so both animate on the same frame. Lenis scroll events forward to `ScrollTrigger.update()` so ScrollTrigger reads virtualised scroll position correctly. **Do not** add `scroll-behavior: smooth` to CSS — Lenis owns that.

### Frame-sequence scrubbing (`ScrollFrameSequence`)

`components/animation/ScrollFrameSequence.tsx` — generic canvas-based scrubber:

- Takes `frameDir` (public path), `frameCount`, optional padding/ext/pin/trigger config
- Preloads all frames, draws to `<canvas>` on ScrollTrigger progress
- `prefers-reduced-motion`: freezes on frame 0, no scrubbing
- Loading and error states built in

Usage:
```tsx
<ScrollFrameSequence
  frameDir="/frames/bowl-build"
  frameCount={120}
  triggerEnd="+=400%"
/>
```

Frame files must be zero-padded: `0000.webp`, `0001.webp`, … `0119.webp`.

### Pinned sections (`usePinnedSection`)

`lib/usePinnedSection.ts` — hook that attaches `ScrollTrigger` pin+scrub to a `containerRef`. Drop it into any section without re-deriving GSAP config:

```tsx
const { containerRef } = usePinnedSection({ pinDuration: "+=300%", onProgress: (p) => ... });
return <section ref={containerRef}>...</section>;
```

## Brand Tokens

Defined in `tailwind.config.ts` and referenced via utility classes — never hardcode hex:

| Token | Class | Value |
|---|---|---|
| Juniper Blue | `text-juniper` / `bg-juniper` | `#818A83` |
| Creamy White | `bg-cream` | `#FFF7F0` |
| Midnight Teal | `text-midnight` | `#292D2A` |
| Moody Grapefruit | `text-grapefruit` | `#D78E77` |
| Headline tracking | `tracking-headline` | `0.10em` |
| Subhead caps tracking | `tracking-subhead-caps` | `0.15em` |
| Subhead mixed tracking | `tracking-subhead-mixed` | `0.02em` |

## Fonts

Self-hosted via `next/font/local`. Placeholder paths in `lib/fonts.ts` — drop real files into `public/fonts/` and update the `src` paths:

- `MontageSerif-Regular.woff2` → CSS var `--font-montage-serif` → `font-headline` utility
- `Satoshi-Light.woff2` → CSS var `--font-satoshi` → `font-subhead-caps` / `font-subhead-mixed` utilities

## Cart State

`store/cartStore.ts` — Zustand store persisted to `localStorage` under key `meros-cart`.

Future auth integration point: add `partialize` to the persist config to strip or scope cart items per user, or swap `storage` to a server-synced adapter.

## Adding Auth Later

No auth is implemented. To add it (NextAuth/Auth.js or Clerk):

1. Add a `/app/(auth)/login/page.tsx` route under a route group — no restructuring needed
2. Add middleware at `middleware.ts` to protect `/build` and `/order` if required
3. The cart store's `persist` config accepts a custom `storage` — swap to a user-scoped store once accounts exist

## Dev

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run format
```