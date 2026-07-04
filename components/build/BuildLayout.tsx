"use client";

import { useState } from "react";
import { StepNav } from "./StepNav";
import { StepPanel } from "./StepPanel";
import { BuildFooter } from "./BuildFooter";
import { MacroDashboard } from "./MacroDashboard";

export function BuildLayout() {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <div className="px-[7vw] pt-28 pb-24">
      <header className="mb-10 md:mb-14">
        <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">
          Build Your Own
        </span>
        <h1
          className="font-headline text-midnight leading-[0.9] uppercase mt-2"
          style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
        >
          Your Bowl
        </h1>
        <p className="font-body-mixed text-sm text-juniper mt-4 max-w-lg">
          Pick your base, stack your toppings, and watch your macros rise in real time.
        </p>
      </header>

      {/* Mobile compact macro bar */}
      <div className="lg:hidden mb-6">
        <MacroDashboard
          compact
          expanded={mobileExpanded}
          onToggleExpand={() => setMobileExpanded((v) => !v)}
        />
      </div>

      <div
        className="flex flex-col lg:flex-row gap-10 lg:gap-16"
        style={{ alignItems: "flex-start" }}
      >
        {/* Left panel */}
        <div className="w-full lg:w-[55%] min-w-0">
          <div className="flex flex-col md:flex-row gap-8 md:gap-12">
            <div className="md:w-36 shrink-0">
              <StepNav />
            </div>
            <div className="flex-1 min-w-0">
              <StepPanel />
              <BuildFooter />
            </div>
          </div>
        </div>

        {/* Right panel — sticky macro dashboard */}
        <aside
          className="hidden lg:block w-full lg:w-[45%] shrink-0"
          style={{ position: "sticky", top: "7rem" }}
        >
          <MacroDashboard />
        </aside>
      </div>
    </div>
  );
}
