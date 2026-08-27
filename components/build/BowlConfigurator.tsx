"use client";

import { useState } from "react";
import { EntranceReveal } from "@/components/transition/EntranceReveal";
import { BuildSizeToggle } from "./BuildSizeToggle";
import { StepNav } from "./StepNav";
import { StepPanel } from "./StepPanel";
import { BuildFooter } from "./BuildFooter";
import { EditBuildFooter } from "./EditBuildFooter";
import { MacroDashboard } from "./MacroDashboard";

interface BowlConfiguratorProps {
  mode: "create" | "edit";
  editLineId?: string;
  /** Edit mode: false once the line being edited has left the cart. */
  editLineExists?: boolean;
  header: {
    eyebrow: string;
    title: string;
    description: string;
  };
}

export function BowlConfigurator({ mode, editLineId, editLineExists = true, header }: BowlConfiguratorProps) {
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return (
    <div className="px-[7vw] pt-28 pb-24">
      <header className="mb-10 md:mb-14">
        {/* Reveal order follows visual hierarchy (title first), not DOM order. */}
        <EntranceReveal index={1}>
          <span className="font-body-caps text-midnight/50 text-[10px] tracking-[0.30em]">
            {header.eyebrow}
          </span>
        </EntranceReveal>
        <EntranceReveal index={0}>
          <h1
            className="font-headline text-midnight leading-[0.9] uppercase mt-2"
            style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}
          >
            {header.title}
          </h1>
        </EntranceReveal>
        <EntranceReveal index={2}>
          <p className="font-body-mixed text-sm text-juniper mt-4 max-w-lg">{header.description}</p>
        </EntranceReveal>
      </header>

      <div className="xl:hidden mb-6">
        <MacroDashboard
          compact
          expanded={mobileExpanded}
          onToggleExpand={() => setMobileExpanded((v) => !v)}
        />
      </div>

      <div className="flex flex-col xl:flex-row gap-8 xl:gap-10" style={{ alignItems: "flex-start" }}>
        <div className="w-full xl:w-2/3 min-w-0 flex flex-col gap-6">
          <BuildSizeToggle />
          <StepNav layout="horizontal" />
          <div>
            <StepPanel />
            {mode === "create" ? (
              <BuildFooter />
            ) : (
              <EditBuildFooter lineId={editLineId!} lineExists={editLineExists} />
            )}
          </div>
        </div>

        <aside
          className="hidden xl:block w-full xl:w-1/3 shrink-0"
          style={{ position: "sticky", top: "7rem" }}
        >
          <MacroDashboard />
        </aside>
      </div>
    </div>
  );
}
