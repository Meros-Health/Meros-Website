"use client";

import { BowlConfigurator } from "./BowlConfigurator";

export function BuildLayout() {
  return (
    <BowlConfigurator
      mode="create"
      header={{
        eyebrow: "Build Your Own",
        title: "Your Bowl",
        description: "Pick your base, stack your toppings, and watch your macros rise in real time.",
      }}
    />
  );
}
