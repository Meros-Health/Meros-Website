"use client";

import { useMemo, useState } from "react";
import { BUILD_CONFIG, getStepForIngredient } from "@/lib/menu/buildConfig";
import { getStepInstruction } from "@/lib/menu/calcBowlPrice";
import { DELIVERY, isDeliveryExtra, isOnDelivery } from "@/lib/menu/delivery";
import { getIngredient, listIngredients, type Ingredient } from "@/lib/menu/ingredients";
import { formatMenuPrice, smoothiePrice, smoothieSizeLabel } from "@/lib/menu/pricing";
import { getDefaultBaseId } from "@/lib/menu/signatureBase";
import { getSizeLabel, listBowls, listSmoothies, type SignatureItem } from "@/lib/menu/signatures";
import { getStack, listStacks, singleEnhancerPrice, stackPrice, stackSize, type Stack } from "@/lib/menu/stacks";

// The menu reference (/source-menu). Everything here is read from menu.json
// through the same accessors the builder, the cart and the Menu TV use, so
// this page cannot say something the till does not charge.
//
// Six columns, one per shelf. Which column a recipe-only ingredient reads as
// is presentation: the builder step that offers an ingredient decides for the
// rest, and the two lists below only settle the ones no step offers.

type Column = "Bases" | "Fruits" | "Nuts" | "Seeds" | "Finishes" | "Enhancers";
const COLUMNS: Column[] = ["Bases", "Fruits", "Nuts", "Seeds", "Finishes", "Enhancers"];

/** Sold on the nuts and seeds step, read as seeds. */
const SEEDS = new Set(["chia-seeds", "hemp-hearts", "pumpkin-seeds", "sunflower-seeds", "flax-meal", "goji-berries"]);
/** Recipe-only powders filed under finishes for the Menu TV, read as enhancers here. */
const POWDERS = new Set(["camu-camu", "acai-powder", "pitaya-powder", "moringa"]);
/** Liquids a smoothie is blended with, read beside the yogurts. */
const LIQUIDS = new Set(["house-whey-water"]);

function columnOf(ingredient: Ingredient): Column {
  const stepId = getStepForIngredient(ingredient.id)?.id ?? ingredient.group;
  if (stepId === "base" || LIQUIDS.has(ingredient.id)) return "Bases";
  if (stepId === "enhancers" || POWDERS.has(ingredient.id)) return "Enhancers";
  if (stepId === "fruits") return "Fruits";
  if (stepId === "nuts-seeds") return SEEDS.has(ingredient.id) ? "Seeds" : "Nuts";
  return "Finishes";
}

type Mode = { kind: "none" } | { kind: "item"; id: string } | { kind: "filter"; filter: "outside" | "stacks" | "delivery" };

const STACK_TONES: Record<string, string> = {
  rebuild: "bg-grapefruit/[0.22] border-grapefruit",
  energy: "bg-[#f3e6bf] border-[#8a6d1f]",
  glow: "bg-blue/40 border-blue",
  greens: "bg-juniper/20 border-juniper",
};

export function SourceMenu() {
  const [mode, setMode] = useState<Mode>({ kind: "none" });

  const items = useMemo(() => [...listBowls(), ...listSmoothies()], []);
  const stacks = useMemo(() => listStacks(), []);
  const ingredients = useMemo(() => listIngredients(), []);

  // ingredient id -> the signatures that use it (recipe or yogurt).
  const usedIn = useMemo(() => {
    const map = new Map<string, SignatureItem[]>();
    for (const item of items) {
      const base = getDefaultBaseId(item);
      for (const id of base ? [...item.recipe, base] : item.recipe) {
        const list = map.get(id) ?? [];
        list.push(item);
        map.set(id, list);
      }
    }
    return map;
  }, [items]);

  const stackOf = useMemo(() => {
    const map = new Map<string, Stack>();
    for (const stack of stacks) for (const id of stack.enhancers) if (!map.has(id)) map.set(id, stack);
    return map;
  }, [stacks]);

  const selectedItem = mode.kind === "item" ? items.find((i) => i.id === mode.id) : undefined;
  const selectedIds = useMemo(() => {
    if (!selectedItem) return new Set<string>();
    const base = getDefaultBaseId(selectedItem);
    return new Set(base ? [...selectedItem.recipe, base] : selectedItem.recipe);
  }, [selectedItem]);

  const isOffered = (id: string) => getStepForIngredient(id) !== undefined;
  const inSignature = (id: string) => usedIn.has(id);

  // How a cell reads under the current selection.
  function cellState(ingredient: Ingredient): { dim: boolean; hit: boolean; tone?: string } {
    const id = ingredient.id;
    if (mode.kind === "item") return { dim: !selectedIds.has(id), hit: selectedIds.has(id) };
    if (mode.kind === "filter") {
      if (mode.filter === "outside") return inSignature(id) ? { dim: true, hit: false } : { dim: false, hit: true };
      if (mode.filter === "delivery") return isDeliveryExtra(id) ? { dim: false, hit: true } : { dim: true, hit: false };
      const stack = stackOf.get(id);
      return stack ? { dim: false, hit: false, tone: STACK_TONES[stack.id] } : { dim: true, hit: false };
    }
    return { dim: false, hit: false };
  }

  function statusLine(): string {
    if (selectedItem) {
      const base = getDefaultBaseId(selectedItem);
      const baseText = base
        ? `on ${getIngredient(base)?.name ?? base}${selectedItem.category === "bowl" ? " (your choice of yogurt)" : ""}`
        : "on the yogurt you choose";
      const stack = selectedItem.suggestedStack ? getStack(selectedItem.suggestedStack) : undefined;
      const channel = isOnDelivery(selectedItem.id) ? "" : ` In store only, not on ${DELIVERY.platform}.`;
      return `${selectedItem.name}, ${baseText}: ${selectedItem.ingredients}.${stack ? ` Pairs with the ${stack.name}.` : ""}${channel}`;
    }
    if (mode.kind === "filter" && mode.filter === "outside") {
      const n = ingredients.filter((i) => !inSignature(i.id)).length;
      return `${n} ingredients are in no signature bowl or smoothie. They are there for custom bowls and for the Stacks.`;
    }
    if (mode.kind === "filter" && mode.filter === "stacks") {
      const price = stackPrice();
      const single = singleEnhancerPrice();
      return `${stacks.length} Stacks, ${stackSize()} enhancers each${price !== undefined ? `, ${formatMenuPrice(price)} on any bowl or smoothie` : ""}.${single !== undefined ? ` One enhancer on its own is ${formatMenuPrice(single)}.` : ""}`;
    }
    if (mode.kind === "filter" && mode.filter === "delivery") {
      return `${DELIVERY.extras.length} toppings can be added to a signature on ${DELIVERY.platform}, ${formatMenuPrice(DELIVERY.extraToppingPrice)} each. In store, anything on the builder can be added.`;
    }
    return "Click a bowl or smoothie to see what is in it. Click a filter to see what sits outside the signatures, the enhancers by Stack, or what can be added on delivery.";
  }

  const toggleItem = (id: string) => setMode((m) => (m.kind === "item" && m.id === id ? { kind: "none" } : { kind: "item", id }));
  const toggleFilter = (filter: "outside" | "stacks" | "delivery") =>
    setMode((m) => (m.kind === "filter" && m.filter === filter ? { kind: "none" } : { kind: "filter", filter }));

  const buttonClass = (on: boolean, bowl = false) =>
    [
      "font-body-mixed rounded-sm border px-3 py-1.5 text-sm transition-colors duration-200",
      on
        ? bowl
          ? "border-grapefruit-text bg-grapefruit-text text-cream"
          : "border-midnight bg-midnight text-cream"
        : "border-midnight/rule bg-white/60 text-midnight hover:border-juniper",
    ].join(" ");

  return (
    <div className="px-section-x pb-24 pt-36">
      <h1 className="font-headline text-midnight leading-[0.9] uppercase" style={{ fontSize: "clamp(2.5rem, 6vw, 5rem)" }}>
        The Meros Menu
      </h1>
      <p className="font-body-mixed text-juniper mt-4 max-w-2xl text-body leading-relaxed">
        Everything we serve, in one place: every ingredient we carry, what each signature bowl and smoothie is made of,
        the four Stacks, and how the store menu differs from {DELIVERY.platform}. This page reads from the same menu
        file as the website, the cart and the board in the store.
      </p>
      <p className="font-body-mixed text-midnight mt-3 max-w-2xl text-body leading-relaxed">{priceLine()}</p>

      {/* Controls */}
      <div className="mt-10 flex flex-col gap-3">
        <ControlRow label="Bowls">
          {listBowls().map((item) => (
            <button key={item.id} type="button" onClick={() => toggleItem(item.id)} aria-pressed={selectedItem?.id === item.id} className={buttonClass(selectedItem?.id === item.id, true)}>
              {item.name}
            </button>
          ))}
        </ControlRow>
        <ControlRow label="Smoothies">
          {listSmoothies().map((item) => (
            <button key={item.id} type="button" onClick={() => toggleItem(item.id)} aria-pressed={selectedItem?.id === item.id} className={buttonClass(selectedItem?.id === item.id)}>
              {item.name}
            </button>
          ))}
        </ControlRow>
        <ControlRow label="Filters">
          <button type="button" onClick={() => toggleFilter("outside")} aria-pressed={mode.kind === "filter" && mode.filter === "outside"} className={buttonClass(mode.kind === "filter" && mode.filter === "outside")}>
            Not in a signature
          </button>
          <button type="button" onClick={() => toggleFilter("stacks")} aria-pressed={mode.kind === "filter" && mode.filter === "stacks"} className={buttonClass(mode.kind === "filter" && mode.filter === "stacks")}>
            Stacks
          </button>
          <button type="button" onClick={() => toggleFilter("delivery")} aria-pressed={mode.kind === "filter" && mode.filter === "delivery"} className={buttonClass(mode.kind === "filter" && mode.filter === "delivery")}>
            {DELIVERY.platform} extras
          </button>
          <button type="button" onClick={() => setMode({ kind: "none" })} className="font-body-mixed text-juniper px-3 py-1.5 text-sm underline-offset-4 hover:underline">
            Clear
          </button>
        </ControlRow>
        <p className="font-body-mixed text-midnight min-h-[1.5rem] max-w-3xl text-sm leading-relaxed" aria-live="polite">
          {statusLine()}
        </p>
        {mode.kind === "filter" && mode.filter === "stacks" && (
          <ul className="font-body-mixed flex flex-wrap gap-x-5 gap-y-1 text-sm text-juniper">
            {stacks.map((stack) => (
              <li key={stack.id} className="flex items-center gap-2">
                <span className={`inline-block h-3 w-3 rounded-sm border ${STACK_TONES[stack.id] ?? "border-midnight"}`} aria-hidden />
                {stack.name}: {stack.enhancers.map((id) => getIngredient(id)?.name ?? id).join(", ")}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* The table */}
      <div className="mt-8 grid grid-cols-2 gap-x-4 border-t-2 border-midnight sm:grid-cols-3 lg:grid-cols-6">
        {COLUMNS.map((column) => {
          const rows = ingredients.filter((i) => columnOf(i) === column);
          return (
            <div key={column} className="min-w-0">
              <h2 className="font-body-caps text-juniper tracking-headline flex items-baseline justify-between border-b border-midnight/rule px-1.5 pb-2 pt-3 text-label uppercase">
                {column}
                <span className="font-body-mixed text-note normal-case tracking-normal">{rows.length}</span>
              </h2>
              <ul className="list-none p-0">
                {rows.map((ingredient) => {
                  const state = cellState(ingredient);
                  const uses = usedIn.get(ingredient.id)?.length ?? 0;
                  const stack = stackOf.get(ingredient.id);
                  const tag = !inSignature(ingredient.id)
                    ? isOffered(ingredient.id) || stack
                      ? stack
                        ? "Stack only"
                        : "Custom bowls"
                      : "Not sold"
                    : !isOffered(ingredient.id)
                      ? "Signature only"
                      : undefined;
                  return (
                    <li
                      key={ingredient.id}
                      className={[
                        "flex items-baseline gap-2 border-b border-midnight/rule border-l-[3px] px-1.5 py-1.5 text-sm transition-opacity duration-300",
                        state.hit ? "border-l-grapefruit bg-grapefruit/[0.16]" : "border-l-transparent",
                        state.tone ?? "",
                        state.dim ? "opacity-25" : "",
                      ].join(" ")}
                    >
                      <span className="font-body-mixed min-w-0 flex-1 text-midnight">{ingredient.name}</span>
                      {tag && <span className="font-body-mixed text-note text-juniper whitespace-nowrap">{tag}</span>}
                      {uses > 0 && (
                        <span className="font-body-mixed text-note text-juniper/80 whitespace-nowrap tabular-nums">
                          {uses} {uses === 1 ? "item" : "items"}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="font-body-mixed text-juniper mt-3 max-w-3xl text-caption leading-relaxed">
        &ldquo;Custom bowls&rdquo; is on the builder but in no signature. &ldquo;Signature only&rdquo; is in a signature but
        not on the builder, so it can be left out of that item but not added to another. &ldquo;Stack only&rdquo; is sold
        as part of a Stack or on its own as an enhancer. &ldquo;Not sold&rdquo; is carried but on no menu today.
      </p>

      {/* Signatures */}
      <Section title="Signature bowls">
        <SignatureList items={listBowls()} />
      </Section>
      <Section title="Signature smoothies">
        <SignatureList items={listSmoothies()} />
      </Section>

      {/* Stacks */}
      <Section title="Stacks">
        <p className="font-body-mixed text-juniper max-w-2xl text-body leading-relaxed">
          A Stack is {stackSize()} enhancers added to any bowl or smoothie
          {stackPrice() !== undefined ? ` for ${formatMenuPrice(stackPrice()!)}` : ""}.
          {singleEnhancerPrice() !== undefined ? ` Any enhancer on its own is ${formatMenuPrice(singleEnhancerPrice()!)}.` : ""}
        </p>
        <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          {stacks.map((stack) => (
            <li key={stack.id} className="border-t border-midnight pt-3">
              <h3 className="font-headline text-midnight text-xl uppercase leading-none">{stack.name}</h3>
              <p className="font-body-mixed text-midnight mt-2 text-sm leading-relaxed">
                {stack.enhancers.map((id) => getIngredient(id)?.name ?? id).join(", ")}
              </p>
              {stack.pairsWith && stack.pairsWith.length > 0 && (
                <p className="font-body-mixed text-juniper mt-1 text-caption leading-relaxed">
                  Pairs with {stack.pairsWith.map((id) => items.find((i) => i.id === id)?.name ?? id).join(", ")}.
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      {/* Build your own */}
      <Section title="Build your own">
        <p className="font-body-mixed text-juniper max-w-2xl text-body leading-relaxed">
          {BUILD_CONFIG.sizes.map((s) => `${s.label} ${formatMenuPrice(s.price)}`).join(" or ")}. Choose a yogurt, then
          add from each shelf.
        </p>
        <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
          {BUILD_CONFIG.steps.map((step) => (
            <li key={step.id} className="font-body-mixed text-sm leading-relaxed">
              <span className="text-midnight">{step.label}.</span> <span className="text-juniper">{getStepInstruction(step)}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Delivery */}
      <Section title={DELIVERY.platform}>
        <p className="font-body-mixed text-juniper max-w-2xl text-body leading-relaxed">{deliveryLine()}</p>
        <p className="font-body-mixed text-midnight mt-3 max-w-3xl text-sm leading-relaxed">
          Toppings that can be added to a signature on {DELIVERY.platform}, {formatMenuPrice(DELIVERY.extraToppingPrice)} each:{" "}
          {DELIVERY.extras.map((id) => getIngredient(id)?.name ?? id).join(", ")}.
        </p>
      </Section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function priceLine(): string {
  const sizes = BUILD_CONFIG.sizes;
  const bowlsInStore = sizes.map((s) => `${formatMenuPrice(s.price)} for a ${s.label.toLowerCase()}`).join(" and ");
  const deliveryBowlSizes = DELIVERY.bowlSizes.map((id) => getSizeLabel("bowl", id).toLowerCase()).join(" and ");
  const smoothie = smoothiePrice();
  const size = smoothieSizeLabel();
  const smoothieText =
    smoothie !== undefined && size
      ? ` Smoothies are ${size}: ${formatMenuPrice(smoothie)} in store, ${formatMenuPrice(DELIVERY.prices.smoothie)} on ${DELIVERY.platform}.`
      : "";
  return `Bowls in store are sold at ${bowlsInStore}. ${DELIVERY.platform} sells only ${deliveryBowlSizes} at ${formatMenuPrice(DELIVERY.prices.bowl)}.${smoothieText}`;
}

function deliveryLine(): string {
  const excluded = (DELIVERY.excludes ?? []).map((id) => [...listBowls(), ...listSmoothies()].find((i) => i.id === id)?.name ?? id);
  const single = getIngredient(DELIVERY.singleEnhancer.ingredientId)?.name ?? DELIVERY.singleEnhancer.ingredientId;
  return [
    `Signature bowls and smoothies are ${formatMenuPrice(DELIVERY.prices.bowl)} on ${DELIVERY.platform}; the store price is lower because the platform takes a commission.`,
    `A Stack is ${formatMenuPrice(DELIVERY.stackPrice)}, or ${single} on its own is ${formatMenuPrice(DELIVERY.singleEnhancer.price)}, not both.`,
    excluded.length > 0 ? `${excluded.join(", ")} ${excluded.length === 1 ? "is" : "are"} sold in store only.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function ControlRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-body-caps text-juniper tracking-headline w-24 shrink-0 text-label uppercase">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-16 border-t border-midnight/rule pt-8">
      <h2 className="font-headline text-midnight uppercase leading-none" style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)" }}>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SignatureList({ items }: { items: SignatureItem[] }) {
  return (
    <ul className="grid grid-cols-1 gap-x-10 gap-y-5 md:grid-cols-2">
      {items.map((item) => {
        const base = getDefaultBaseId(item);
        const stack = item.suggestedStack ? getStack(item.suggestedStack) : undefined;
        return (
          <li key={item.id} className="border-t border-midnight pt-3">
            <h3 className="font-headline text-midnight text-xl uppercase leading-none">{item.name}</h3>
            <p className="font-body-caps text-grapefruit-text tracking-headline mt-1.5 text-label uppercase">{item.tags.join(" · ")}</p>
            <p className="font-body-mixed text-midnight mt-2 text-sm leading-relaxed">{item.ingredients}.</p>
            <p className="font-body-mixed text-juniper mt-1 text-caption leading-relaxed">
              {base ? `Made on ${getIngredient(base)?.name ?? base}.` : "Made on the yogurt you choose."}
              {stack ? ` Pairs with the ${stack.name}.` : ""}
              {isOnDelivery(item.id) ? "" : ` In store only.`}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
