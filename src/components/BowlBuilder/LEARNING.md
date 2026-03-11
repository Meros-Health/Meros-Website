# BowlBuilder — Learnings & Architecture

## Component Overview

The Bowl Builder is a full-page interactive feature where users customize yogurt bowls by selecting ingredients from an orbital (circular) menu. It consists of:

- **BowlBuilder.tsx** — Page-level layout: header, grid with selector + macro panel, mobile panel, selected items bar, save toast
- **OrbitalSelect.tsx** — The circular ingredient selector with orbiting nodes, popup cards, and auto-rotation
- **MacroPanel.tsx** — Nutritional breakdown panel (desktop sidebar + mobile sticky bottom)
- **CategoryTabs.tsx** — Tab bar to switch ingredient categories (Base, Protein, Fruits, Toppings, Drizzles)
- **IngredientCard.tsx** — (unused in orbital view, may be legacy)
- **ingredients.ts** — All ingredient data with nutritional info

## Key Architecture Decisions

### Overflow & Layout Containment

**Problem:** When a user clicks an orbiting node near the edge, the popup card (`.orbital-card`) extends beyond the container. This caused:
1. Horizontal/vertical scrollbars appearing
2. The MacroPanel getting pushed down temporarily
3. Viewport resizing momentarily

**What we tried and why:**

1. `overflow: clip` on `.orbital-container` — Fixed scrollbar issue but **clipped the orbital nodes and popup cards** at the container boundary. Nodes near edges got cut off, shadows got sliced. This looked broken.

2. `overflow: clip` on `.bowl-builder` (page-level wrapper) — **The correct fix.** The page wrapper is much wider than the orbital area, so nodes/popups can freely overflow their immediate container without being visually clipped. But if anything extends beyond the full page boundary, it's contained — no scrollbars, no layout push.

**Rule:** Never put overflow containment on `.orbital-container` or `.orbital-stage`. Those must remain `overflow: visible`. Containment belongs on `.bowl-builder` (the page wrapper in BowlBuilder.tsx).

### Node Sizing & Orbit Radius

All sizing is computed dynamically in `computeFromContainer(width, height)` based on the container's rendered dimensions via ResizeObserver.

**The sizing pipeline:**
1. Container dimensions measured → `width`, `height`
2. Card size computed from smaller axis → `cardWidth`, `cardHeight`
3. Orbit radius derived from card size (cards determine padding, padding determines usable space, usable space determines radius)
4. Font size scales with card width

**Tunable knobs** (all in `computeFromContainer`):
- `CARD_MIN` / `CARD_MAX` — min/max card width in px
- `CARD_SCALE` — how aggressively cards grow with container (multiplier on smaller axis)
- `CARD_ASPECT` — height-to-width ratio of cards
- `ORBIT_PAD_FACTOR` — how much padding between cards and container edge (multiplier on card size)
- `RADIUS_MIN` — minimum orbit radius floor
- `FONT_MIN` / `FONT_MAX` — font size range in rem

**Key relationship:** Orbit radius is directly derived from card size. Bigger cards → more padding → radius adjusts to fit. The `ORBIT_PAD_FACTOR` controls the spacing between nodes and the container edge, which effectively controls inter-node spacing since nodes are distributed evenly around the orbit circumference.

### Centering Behavior

When a node is clicked:
1. `expandedId` is set → popup appears
2. `autoRotate` stops
3. `centerViewOnNode` rotates the orbit so the clicked node is at the top (270°)
4. The popup drops below the centered node — fully visible in the container

This means popups are always visible after the centering animation completes. The brief transition while centering is acceptable.

### Layout Grid

- Desktop (>1024px): 2-column grid — `1fr 380px` (orbital | macro panel)
- Mobile (<=1024px): Single column, macro panel becomes fixed bottom bar
- The `.bowl-builder__panel` uses `position: sticky; top: 7rem` on desktop

## Common Pitfalls

1. **Don't add overflow containment to orbital-container.** It clips nodes and popups. Use `.bowl-builder` instead.
2. **Don't use `overflow: hidden` where `overflow: clip` works.** `hidden` creates a scroll container; `clip` just clips without side effects.
3. **Card sizes and orbit radius are coupled.** Changing card size without adjusting orbit radius will cause nodes to overlap or float too far apart. Always adjust them together via the knobs in `computeFromContainer`.
4. **The popup (`.orbital-card`) is absolutely positioned relative to `.orbital-node`.** It's not a portal. It travels with the node during rotation/centering.
5. **Auto-rotation uses setInterval at 50ms intervals** with 0.25° per tick. Stopping/starting is controlled by `autoRotate` state.

## File Locations

| What | Where |
|------|-------|
| Page layout, grid, overflow containment | `BowlBuilder.tsx` styles |
| Node sizing, orbit radius, scaling knobs | `OrbitalSelect.tsx` → `computeFromContainer()` |
| Popup card styles | `OrbitalSelect.tsx` → `.orbital-card` CSS |
| Ingredient data & nutrition | `ingredients.ts` |
| Macro summary panel | `MacroPanel.tsx` |
| Category switching | `CategoryTabs.tsx` |
