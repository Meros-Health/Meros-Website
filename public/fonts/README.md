# Fonts

Paid/licensed font files. Two of them are committed, because Workers Builds
clones this repo to build and `next/font/local` resolves these paths at build
time: an ignored file means a failed deploy. Everything else here is a local
source format and stays untracked.

Loaded by the app (committed, `git add -f`, see `lib/fonts.ts`):

- `Montage Serif Font Regular.otf`: headlines and the wordmark. Preloaded.
- `Aetheria.woff2`: accent and editorial text. Not preloaded, and deliberately
  not part of the preloader gate (`GATING_FONTS` in `lib/fonts.ts` explains why).

Local sources, untracked, never deployed:

- `Aetheria.otf`: the source `Aetheria.woff2` was built from.
  `npx ttf2woff2 < Aetheria.otf > Aetheria.woff2`
- `Aetheria.ttf`: an older format, kept only as a fallback source.

DM Sans comes from `next/font/google` and is self-hosted by Next at build time,
so it has no file here.
