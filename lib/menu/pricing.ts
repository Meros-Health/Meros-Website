/** Single source of truth for all menu pricing. */
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
  signatureBowls: {
    moment: 15.0,
    silk: 15.5,
    crunch: 14.5,
    tropic: 14.5,
    bloom: 14.5,
    bounty: 14.5,
  },
  signatureSmoothies: {
    rise: 12.0,
    crave: 12.5,
    essence: 12.5,
    recovery: 13.0,
    cabana: 12.5,
    nutty: 12.0,
  },
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

export function getSignaturePrice(id: string): number {
  const price =
    PRICING.signatureBowls[id as keyof typeof PRICING.signatureBowls] ??
    PRICING.signatureSmoothies[id as keyof typeof PRICING.signatureSmoothies];
  if (price === undefined) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(`[pricing] Unknown signature item id "${id}" — falling back to $0.`);
    }
    return 0;
  }
  return price;
}
