// The seven menu.json drift variants from the stress test report (H1 to H3),
// expressed as mutations of the real menu so they never drift from it.
import { findIngredientIndex, findSignature, findStep, type MenuVariant } from "../helpers/menuVariant";

function removeIngredient(menu: Parameters<MenuVariant>[0], id: string) {
  const idx = findIngredientIndex(menu, id);
  if (idx >= 0) menu.ingredients.splice(idx, 1);
  for (const step of menu.build.steps) {
    step.options = step.options.filter((opt: { ingredientId: string }) => opt.ingredientId !== id);
  }
  for (const list of ["bowls", "smoothies"]) {
    for (const item of menu.signatures[list]) {
      item.recipe = item.recipe.filter((rid: string) => rid !== id);
    }
  }
}

export const requiredIngredientRemoved: MenuVariant = (menu) => removeIngredient(menu, "plain-greek-yogurt");

export const optionalIngredientRemoved: MenuVariant = (menu) => removeIngredient(menu, "strawberries");

export const fruitsRequired: MenuVariant = (menu) => {
  findStep(menu, "fruits").required = true;
};

export const largeSizeRemoved: MenuVariant = (menu) => {
  menu.build.sizes = menu.build.sizes.filter((s: { id: string }) => s.id !== "large");
};

export const signatureRemovedAndSilkLargeRemoved: MenuVariant = (menu) => {
  menu.signatures.bowls = menu.signatures.bowls.filter((b: { id: string }) => b.id !== "moment");
  const silk = findSignature(menu, "silk");
  if (silk) delete silk.item.sizes.large;
};

export const pricesRaised: MenuVariant = (menu) => {
  const medium = menu.build.sizes.find((s: { id: string }) => s.id === "medium");
  medium.price = 14;
  const crunch = findSignature(menu, "crunch");
  if (crunch) crunch.item.sizes.medium.price = 13.5;
};

export const fruitsIncludedLowered: MenuVariant = (menu) => {
  findStep(menu, "fruits").pricing.included = 1;
};
