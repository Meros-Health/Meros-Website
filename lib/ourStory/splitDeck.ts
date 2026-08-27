// Geometry for "pick a card out of the stack" in the Our Story fan.
//
// The fan draws card k above card k-1. Opening card N must leave it fully
// visible without re-layering, so the cards drawn over it (N+1..) move right
// and N (plus the cards beneath it) moves left. Translation alone rarely has
// the room: the tilted boxes overlap by most of a card's width, the left side
// is bounded by the headline text and the right side by the viewport. So the
// right group is also allowed to close up (each card rotates toward the
// group's mean angle about its own centre), which narrows its footprint from
// both sides. The solver takes the least compression that fits without
// bleeding past the right boundary, and only bleeds when nothing fits.
//
// Pure: no DOM. Inputs are screen-space numbers read at open time.

export interface CardGeom {
  /** Centre of the card's bounding box in screen px (equals the rotated centre). */
  cx: number;
  cy: number;
  /** Current rotation of the card, degrees (CSS sign: positive is clockwise). */
  angle: number;
}

export interface SplitInput {
  cards: CardGeom[];
  selected: number;
  /** Unrotated card box. */
  cardW: number;
  cardH: number;
  /** Nothing in the left group may cross this x (headline text + margin, or the stage's left edge). */
  leftBoundary: number;
  /** The right group should stay left of this x (viewport width minus a small margin). */
  rightBoundary: number;
  /** Clear space between the selected card's right edge and the right group. */
  gap?: number;
  /** Smallest shift so a pick always reads as motion. */
  minShift?: number;
  /** Share of the needed separation taken by the left move before spilling right. */
  leftShare?: number;
  /** Tightest allowed compression of the right group (1 = unchanged angles). */
  maxCompression?: number;
}

export interface CardMove {
  /** Screen-space horizontal shift, px (negative = left). */
  dx: number;
  /** Extra rotation about the card's own centre, degrees. Selected cards straighten (-angle). */
  dRotation: number;
}

export interface SplitOutput {
  moves: CardMove[];
  /** Left shift of the selected card, px. */
  dLeft: number;
  /** Right shift of the right group, px. */
  dRight: number;
  /** How far the right group ends past rightBoundary, px (0 when everything fits). */
  bleed: number;
  /** Compression applied to the right group's angles (1 = none). */
  compression: number;
}

export const SPLIT_DEFAULTS = {
  gap: 24,
  minShift: 40,
  leftShare: 0.55,
  maxCompression: 0.4,
} as const;

const COMPRESSION_STEPS = [1, 0.85, 0.7, 0.55, 0.4];
const BUNCH_STEPS = [0, 0.5, 1];

/** Horizontal extent of a w×h box rotated by `angle` about its centre. */
export function extent(cx: number, angle: number, w: number, h: number) {
  const r = (angle * Math.PI) / 180;
  const half = (w * Math.abs(Math.cos(r)) + h * Math.abs(Math.sin(r))) / 2;
  return { left: cx - half, right: cx + half };
}

export function splitDeck(input: SplitInput): SplitOutput {
  const { cards, selected, cardW, cardH, leftBoundary, rightBoundary } = input;
  const gap = input.gap ?? SPLIT_DEFAULTS.gap;
  const minShift = input.minShift ?? SPLIT_DEFAULTS.minShift;
  const leftShare = input.leftShare ?? SPLIT_DEFAULTS.leftShare;
  const maxCompression = input.maxCompression ?? SPLIT_DEFAULTS.maxCompression;

  const sel = cards[selected];
  const selLeft = sel.cx - cardW / 2; // straightened
  const selRight = sel.cx + cardW / 2;
  const leftRoom = Math.max(0, selLeft - leftBoundary);

  const rightIdx = cards.map((_, k) => k).filter((k) => k > selected);
  const finalAngles = cards.map((c) => c.angle);
  const bunchExtra = cards.map(() => 0);

  let dLeft: number;
  let dRight = 0;
  let bleed = 0;
  let compression = 1;

  if (rightIdx.length === 0) {
    dLeft = Math.min(minShift, leftRoom);
  } else {
    const mean = rightIdx.reduce((s, k) => s + cards[k].angle, 0) / rightIdx.length;
    const steps = COMPRESSION_STEPS.filter((c) => c >= maxCompression - 1e-9);
    const top = rightIdx[rightIdx.length - 1];

    // Two ways for the right group to make room, searched from least to most
    // change: the lower cards slide in behind the top card ("bunch"), and the
    // group's angles close toward their mean ("compression"). Bunching is
    // tried first at each compression because sliding reads calmer than
    // re-tilting.
    let plan: { c: number; needed: number; rightRoom: number; angles: number[]; extra: number[] } | null = null;
    search: for (const c of steps) {
      const angles = cards.map((card, k) => (k > selected ? mean + c * (card.angle - mean) : card.angle));
      const ext = cards.map((card, k) => extent(card.cx, angles[k], cardW, cardH));
      for (const bunch of BUNCH_STEPS) {
        const extra = cards.map((_, k) => (k > selected ? bunch * Math.max(0, ext[top].left - ext[k].left) : 0));
        let xL = Infinity;
        let xR = -Infinity;
        for (const k of rightIdx) {
          xL = Math.min(xL, ext[k].left + extra[k]);
          xR = Math.max(xR, ext[k].right + extra[k]);
        }
        const needed = Math.max(0, selRight + gap - xL);
        const rightRoom = Math.max(0, rightBoundary - xR);
        plan = { c, needed, rightRoom, angles, extra };
        if (needed <= leftRoom + rightRoom) break search;
      }
    }
    // `plan` is the first fit, or the tightest configuration when nothing fits.
    const { c, needed, rightRoom, angles, extra } = plan!;
    compression = c;
    rightIdx.forEach((k) => {
      finalAngles[k] = angles[k];
      bunchExtra[k] = extra[k];
    });

    dLeft = Math.min(leftRoom, Math.max(minShift, needed * leftShare));
    dRight = Math.max(0, needed - dLeft);
    if (dRight > rightRoom) {
      // Spill back to the left as far as the headline allows; the rest bleeds.
      dLeft = Math.min(leftRoom, Math.max(dLeft, needed - rightRoom));
      dRight = Math.max(0, needed - dLeft);
    }
    // The right group should visibly move too, when there is room for it.
    if (dRight < minShift) dRight = Math.min(Math.max(dRight, minShift), Math.max(rightRoom, dRight));
    bleed = Math.max(0, dRight - rightRoom);
  }

  const moves: CardMove[] = cards.map((card, k) => {
    if (k === selected) return { dx: -dLeft, dRotation: -card.angle };
    if (k > selected) return { dx: dRight + bunchExtra[k], dRotation: finalAngles[k] - card.angle };
    // Beneath the selected card: spread left only as far as its own tilted box allows.
    const own = Math.max(0, extent(card.cx, card.angle, cardW, cardH).left - leftBoundary);
    return { dx: -Math.min(dLeft, own), dRotation: 0 };
  });

  return { moves, dLeft, dRight, bleed, compression };
}
