// The "pick a card out of the stack" geometry for the Our Story fan. Cases
// rebuild the real fan from the section's constants (card size, pivot at
// 120% of the card height, end angles) at the widths the section is
// verified at, and check invariants rather than magic numbers.
import { describe, expect, it } from "vitest";
import { SPLIT_DEFAULTS, extent, splitDeck, type CardGeom, type SplitInput } from "@/lib/ourStory/splitDeck";

const PIVOT = 1.2; // FAN_PIVOT "50% 120%"

// Card centres for a fan rotated about a shared pivot below the deck.
function fan(pivotX: number, pivotY: number, cardH: number, angles: number[]): CardGeom[] {
  const lever = (PIVOT - 0.5) * cardH; // pivot to card centre
  return angles.map((angle) => {
    const r = (angle * Math.PI) / 180;
    return { cx: pivotX + lever * Math.sin(r), cy: pivotY - lever * Math.cos(r), angle };
  });
}

const DESKTOP_ANGLES = [-30, -10, 10, 30];
const STACKED_ANGLES = [-8, -3, 3, 8];

// Measured on the built page (see the verification notes in the plan).
const AT_1440: SplitInput = {
  cards: fan(1012, 800, 386, DESKTOP_ANGLES),
  selected: 0,
  cardW: 288,
  cardH: 386,
  leftBoundary: 621 + 24,
  rightBoundary: 1440 - 8,
};
const AT_1280: SplitInput = {
  cards: fan(896, 720, 350, DESKTOP_ANGLES),
  selected: 0,
  cardW: 256,
  cardH: 350,
  leftBoundary: 562 + 24,
  rightBoundary: 1280 - 8,
};
const AT_1920: SplitInput = {
  cards: fan(1340, 900, 422, DESKTOP_ANGLES),
  selected: 0,
  cardW: 320,
  cardH: 422,
  leftBoundary: 800 + 24,
  rightBoundary: 1920 - 8,
};
// Stacked layout: the resting fan already overhangs its narrow stage, so the
// boundaries are the viewport edges.
const AT_390: SplitInput = {
  cards: fan(200, 420, 335, STACKED_ANGLES),
  selected: 1,
  cardW: 250,
  cardH: 335,
  leftBoundary: 8,
  rightBoundary: 390 - 8,
};

function after(input: SplitInput) {
  const out = splitDeck(input);
  const boxes = input.cards.map((card, k) => {
    const m = out.moves[k];
    return extent(card.cx + m.dx, card.angle + m.dRotation, input.cardW, input.cardH);
  });
  return { out, boxes };
}

function expectSeparated(input: SplitInput) {
  const { out, boxes } = after(input);
  const sel = boxes[input.selected];
  const gap = input.gap ?? SPLIT_DEFAULTS.gap;
  boxes.forEach((b, k) => {
    if (k > input.selected) expect(b.left).toBeGreaterThanOrEqual(sel.right + gap - 0.5);
    // Cards on the left never cross the boundary, and a card that already
    // rests inside the margin is never pushed further left.
    if (k <= input.selected) {
      const resting = extent(input.cards[k].cx, input.cards[k].angle, input.cardW, input.cardH).left;
      expect(b.left).toBeGreaterThanOrEqual(Math.min(input.leftBoundary, resting) - 0.5);
    }
  });
  // The selected card is straight.
  expect(input.cards[input.selected].angle + out.moves[input.selected].dRotation).toBeCloseTo(0, 6);
  return out;
}

describe("splitDeck", () => {
  it("clears every selection at 1440 without bleeding", () => {
    for (let selected = 0; selected < 4; selected++) {
      const out = expectSeparated({ ...AT_1440, selected });
      expect(out.bleed).toBe(0);
    }
  });

  it("clears every selection at 1280 without bleeding", () => {
    for (let selected = 0; selected < 4; selected++) {
      const out = expectSeparated({ ...AT_1280, selected });
      expect(out.bleed).toBe(0);
    }
  });

  it("does not compress the right group when translation alone fits (1920, card 03)", () => {
    const out = expectSeparated({ ...AT_1920, selected: 2 });
    expect(out.compression).toBe(1);
    expect(out.bleed).toBe(0);
  });

  it("still moves the top card a little when nothing is above it", () => {
    const out = splitDeck({ ...AT_1440, selected: 3 });
    expect(out.dLeft).toBe(SPLIT_DEFAULTS.minShift);
    expect(out.dRight).toBe(0);
    expect(out.moves.every((m, k) => (k === 3 ? m.dx === -SPLIT_DEFAULTS.minShift : m.dx <= 0))).toBe(true);
  });

  it("keeps the cards beneath the selection inside the left boundary", () => {
    const { out, boxes } = after({ ...AT_1440, selected: 2 });
    // Card 01 sits at -30deg; its tilted box has less room than the selected card.
    expect(out.moves[0].dx).toBeGreaterThan(-out.dLeft);
    expect(boxes[0].left).toBeGreaterThanOrEqual(AT_1440.leftBoundary - 0.5);
  });

  it("bleeds on a phone but still separates and respects the left edge", () => {
    const out = expectSeparated(AT_390);
    expect(out.bleed).toBeGreaterThan(0);
  });

  it("never rotates the cards beneath the selection", () => {
    const out = splitDeck({ ...AT_1440, selected: 2 });
    expect(out.moves[0].dRotation).toBe(0);
    expect(out.moves[1].dRotation).toBe(0);
  });
});
