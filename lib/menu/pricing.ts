/**
 * Custom-bowl pricing. Signature bowl and smoothie prices live in
 * lib/menu/menu.json and are read through lib/menu/signatures.ts.
 */
export const PRICING = {
  bases: {
    "base-plain": 12.0,
    "base-vanilla": 12.5,
    "base-vegan": 13.0,
    "base-protein": 14.0,
  },
  includedPerCategory: {
    fruitsBerries: 3,
    nutsSeeds: 3,
  },
  extraItemSurcharge: 3,
  finishPrice: 3,
  enhancerPrice: 3,
} as const;

export function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatSurcharge(amount: number): string {
  return `+${formatPrice(amount)}`;
}

export function getBasePrice(id: string): number {
  return PRICING.bases[id as keyof typeof PRICING.bases] ?? 0;
}
