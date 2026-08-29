"use client";

import { Suspense } from "react";
import { BowlConfigurator } from "./BowlConfigurator";
import { PrefillNotice } from "./PrefillNotice";

export function BuildLayout() {
  return (
    <BowlConfigurator
      mode="create"
      header={{
        eyebrow: "Build Your Own",
        title: "Your Bowl",
        description: "Pick your base, stack your toppings, and watch your macros rise in real time.",
      }}
      // useSearchParams needs a Suspense boundary above it, or the whole
      // builder is pushed to client-side rendering. Fallback is nothing: the
      // notice is an extra, and the builder must not wait on it.
      notice={
        <Suspense fallback={null}>
          <PrefillNotice />
        </Suspense>
      }
    />
  );
}
