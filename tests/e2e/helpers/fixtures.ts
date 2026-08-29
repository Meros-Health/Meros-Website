// Persisted cart lines the specs seed. Shape mirrors store/cartStore.ts CartItem.
export const NUTRITION = { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, potassium: 0 };

export function plainBowl(lineId: string) {
  return {
    lineId,
    kind: "custom",
    productId: "custom-bowl",
    name: "Custom Bowl · Plain Greek Yogurt · Medium",
    selection: { sizeId: "medium", steps: { base: ["plain-greek-yogurt"] } },
    size: { id: "medium", label: "Medium" },
    nutrition: NUTRITION,
    quantity: 1,
    unitPrice: 12,
  };
}

export function moment(lineId: string, quantity = 1) {
  return {
    lineId,
    kind: "signature",
    productId: "moment",
    name: "The Moment · Medium",
    size: { id: "medium", label: "Medium" },
    base: "plain-greek-yogurt",
    nutrition: NUTRITION,
    quantity,
    unitPrice: 12,
  };
}
