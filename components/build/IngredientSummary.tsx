"use client";

import { useBowlBuilderStore } from "@/store/bowlBuilderStore";

export function IngredientSummary() {
  const selection = useBowlBuilderStore((s) => s.selection);

  if (!selection.base) return null;

  const groups = [
    { label: "Base", items: [selection.base] },
    { label: "Fruits & Berries", items: selection.fruitsBerries },
    { label: "Nuts & Seeds", items: selection.nutsSeeds },
    { label: "Finish", items: selection.finish ? [selection.finish] : [] },
    { label: "Enhancers", items: selection.enhancers },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="flex flex-col gap-3">
      <p className="font-body-caps text-[9px] tracking-[0.25em] text-juniper">Your bowl</p>
      {groups.map((group) => (
        <div key={group.label}>
          <p className="font-body-caps text-[9px] tracking-widest text-midnight/50 mb-1">
            {group.label}
          </p>
          <ul className="flex flex-wrap gap-x-2 gap-y-1">
            {group.items.map((item) => (
              <li key={item.id} className="font-body-mixed text-xs text-midnight">
                {item.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
