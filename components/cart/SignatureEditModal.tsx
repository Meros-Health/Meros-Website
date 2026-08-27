"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SizeToggle } from "@/components/ui/SizeToggle";
import { formatPrice, formatSurcharge } from "@/lib/menu/calcBowlPrice";
import { ingredientName } from "@/lib/menu/ingredients";
import {
  MAX_ADDITIONS,
  MAX_REMOVALS,
  calcSignaturePrice,
  getAdditionPrice,
  isRemovable,
  listAddableGroups,
} from "@/lib/menu/signatureMods";
import { getSignatureItem, getSignaturePrice, getSizeTiers, type SignatureItem } from "@/lib/menu/signatures";
import { lockScroll } from "@/lib/scrollLock";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useCartStore, type CartItem } from "@/store/cartStore";

// Edits one signature line in place over the cart drawer: size, up to two
// additions from the builder's steps, up to two recipe ingredients left out.
// The draft lives here until Save; the store sanitizes and re-prices on save.

const MODAL_Z = 135; // above the cart drawer (130), below the page transition cover (140)
const PANEL_DURATION = 0.45;
const PANEL_EASE = [0.16, 1, 0.3, 1] as const;

const HAIRLINE = "0.5px solid rgba(41,45,42,0.12)";
const HAIRLINE_STRONG = "0.5px solid rgba(41,45,42,0.28)";

export function SignatureEditModal() {
  const editingLineId = useCartStore((s) => s.editingLineId);
  const item = useCartStore((s) => (s.editingLineId ? s.items.find((i) => i.lineId === s.editingLineId) : undefined));
  const closeEdit = useCartStore((s) => s.closeEdit);

  const catalogItem = item?.kind === "signature" ? getSignatureItem(item.productId) : undefined;
  const isOpen = editingLineId !== null && item !== undefined && catalogItem !== undefined;

  // The line left the cart (removed here, or in another tab) while the modal
  // was open: there is nothing to save into, so close.
  useEffect(() => {
    if (editingLineId !== null && !isOpen) closeEdit();
  }, [editingLineId, isOpen, closeEdit]);

  // Keyed per open, so a reopened line starts from what the cart holds rather
  // than from a draft left behind by a Cancel during the exit animation.
  const session = useCartStore((s) => s.editSession);

  return (
    <AnimatePresence>
      {isOpen && item && catalogItem && (
        <EditDialog key={`${item.lineId}:${session}`} item={item} catalogItem={catalogItem} onClose={closeEdit} />
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------

function EditDialog({
  item,
  catalogItem,
  onClose,
}: {
  item: CartItem;
  catalogItem: SignatureItem;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const s = (seconds: number) => (reduced ? 0 : seconds);
  const titleId = useId();
  const recipeId = useId();
  const additionsId = useId();

  const updateSignatureLine = useCartStore((st) => st.updateSignatureLine);

  const [sizeId, setSizeId] = useState(item.size?.id ?? Object.keys(catalogItem.sizes)[0]);
  const [additions, setAdditions] = useState<string[]>(item.mods?.additions ?? []);
  const [removals, setRemovals] = useState<string[]>(item.mods?.removals ?? []);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  const groups = useMemo(() => listAddableGroups(catalogItem), [catalogItem]);
  const hasSizes = getSizeTiers(catalogItem.category).length > 1;
  const noun = catalogItem.category === "bowl" ? "bowl" : "smoothie";

  const basePrice = getSignaturePrice(catalogItem.id, sizeId);
  const price = calcSignaturePrice(catalogItem.id, sizeId, { additions, removals });
  const delta = price !== undefined && basePrice !== undefined ? price - basePrice : 0;

  const atAddCap = additions.length >= MAX_ADDITIONS;
  const atRemoveCap = removals.length >= MAX_REMOVALS;

  // Scroll lock is reference counted with the drawer's; released on unmount.
  useEffect(() => lockScroll(), []);

  // Focus: the Close button once the panel has settled; back to whatever
  // opened the modal (the line's Edit button) when it unmounts.
  useEffect(() => {
    openerRef.current = document.activeElement;
    const t = setTimeout(() => closeRef.current?.focus(), s(PANEL_DURATION) * 1000);
    return () => {
      clearTimeout(t);
      const opener = openerRef.current;
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusTrap(panelRef, true);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const toggleAddition = (id: string) => {
    setAdditions((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : atAddCap ? current : [...current, id]
    );
  };

  const toggleRemoval = (id: string) => {
    setRemovals((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : atRemoveCap ? current : [...current, id]
    );
  };

  const handleSave = () => {
    updateSignatureLine(item.lineId, { sizeId, mods: { additions, removals } });
    onClose();
  };

  return (
    <div
      className="flex items-end justify-center md:items-center md:p-6"
      style={{ position: "fixed", inset: 0, zIndex: MODAL_Z }}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: s(PANEL_DURATION * 0.6), ease: "easeOut" }}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(41,45,42,0.35)",
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
      />

      {/* Panel: a bottom sheet on small screens, centered from md up */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-signature-edit
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ duration: s(PANEL_DURATION), ease: PANEL_EASE }}
        className="relative flex w-full flex-col md:max-w-[560px]"
        style={{
          maxHeight: "min(90vh, 100%)",
          background: "var(--color-cream)",
          boxShadow: "0 -8px 32px rgba(41,45,42,0.18)",
          borderTop: HAIRLINE_STRONG,
          containerType: "inline-size",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 px-6 py-5" style={{ borderBottom: HAIRLINE }}>
          <div className="min-w-0">
            <p className="font-body-caps text-[10px] tracking-widest text-grapefruit">Edit</p>
            <h2 id={titleId} className="font-headline text-midnight leading-none mt-1" style={{ fontSize: "1.35rem" }}>
              {catalogItem.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close edit"
            onClick={onClose}
            className="font-body-caps text-[10px] tracking-widest text-juniper px-3 py-2 transition-opacity hover:opacity-70"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" data-lenis-prevent>
          {hasSizes && (
            <section>
              <p className="font-body-caps text-[10px] tracking-widest text-midnight mb-2">Size</p>
              <SizeToggle category={catalogItem.category} value={sizeId} onChange={setSizeId} />
            </section>
          )}

          <section role="group" aria-labelledby={recipeId}>
            <SectionHeading id={recipeId} title={`In this ${noun}`} caption={`Remove up to ${MAX_REMOVALS}`} count={removals.length} max={MAX_REMOVALS} />
            <div className="flex flex-wrap gap-2 mt-3">
              {catalogItem.recipe.map((id) => {
                const name = ingredientName(id);
                if (!isRemovable(catalogItem, id)) {
                  return <StaticChip key={id} label={name} />;
                }
                const removed = removals.includes(id);
                return (
                  <Chip
                    key={id}
                    label={removed ? `No ${name}` : name}
                    pressed={removed}
                    disabled={!removed && atRemoveCap}
                    strike={removed}
                    onClick={() => toggleRemoval(id)}
                  />
                );
              })}
            </div>
          </section>

          {groups.length > 0 && (
            <section role="group" aria-labelledby={additionsId}>
              <SectionHeading id={additionsId} title="Additions" caption={`Add up to ${MAX_ADDITIONS}`} count={additions.length} max={MAX_ADDITIONS} />
              <div className="space-y-4 mt-3">
                {groups.map(({ step, ingredients }) => (
                  <div key={step.id}>
                    <p className="font-body-caps text-[9px] tracking-widest text-juniper mb-2">{step.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {ingredients.map((ingredient) => {
                        const added = additions.includes(ingredient.id);
                        return (
                          <Chip
                            key={ingredient.id}
                            label={ingredient.name}
                            hint={formatSurcharge(getAdditionPrice(step, ingredient.id))}
                            pressed={added}
                            disabled={!added && atAddCap}
                            onClick={() => toggleAddition(ingredient.id)}
                          />
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5" style={{ borderTop: HAIRLINE }}>
          <div className="flex justify-between pb-4">
            <span className="font-body-caps text-[11px] text-midnight">Item price</span>
            <span className="font-body-caps text-[11px] text-midnight" data-edit-price>
              {price === undefined ? "Unavailable" : formatPrice(price)}
              {delta > 0 && <span className="text-juniper ml-2">({formatSurcharge(delta)})</span>}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-body-caps text-[10px] tracking-widest py-3 transition-opacity hover:opacity-80"
              style={{ background: "transparent", color: "var(--color-midnight)", border: HAIRLINE_STRONG }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={price === undefined}
              className="flex-1 font-body-caps text-[10px] tracking-widest py-3 transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-midnight)",
                color: "var(--color-cream)",
                border: "0.5px solid var(--color-midnight)",
              }}
            >
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function SectionHeading({
  id,
  title,
  caption,
  count,
  max,
}: {
  id: string;
  title: string;
  caption: string;
  count: number;
  max: number;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <div>
        <p id={id} className="font-body-caps text-[10px] tracking-widest text-midnight">
          {title}
        </p>
        <p className="font-body-mixed text-xs text-juniper mt-0.5">{caption}</p>
      </div>
      <span className="font-body-caps text-[10px] tracking-widest text-juniper shrink-0" aria-live="polite">
        {count} / {max}
      </span>
    </div>
  );
}

const CHIP_CLASS = "font-body-caps text-[10px] tracking-widest px-3 py-2 transition-colors duration-200 disabled:cursor-not-allowed";

function Chip({
  label,
  hint,
  pressed,
  disabled,
  strike = false,
  onClick,
}: {
  label: string;
  hint?: string;
  pressed: boolean;
  disabled: boolean;
  strike?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={CHIP_CLASS}
      style={{
        border: pressed ? "0.5px solid var(--color-midnight)" : HAIRLINE_STRONG,
        background: pressed && !strike ? "var(--color-midnight)" : "transparent",
        color: pressed && !strike ? "var(--color-cream)" : "var(--color-midnight)",
        textDecoration: strike ? "line-through" : undefined,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {label}
      {/* The space is part of the accessible name: "Mangoes +$2.00". */}
      {hint && (
        <>
          {" "}
          <span className="ml-2 opacity-70">{hint}</span>
        </>
      )}
    </button>
  );
}

/** The base: part of every recipe, not offered as a removal. */
function StaticChip({ label }: { label: string }) {
  return (
    <span className={CHIP_CLASS} style={{ border: HAIRLINE, color: "var(--color-juniper)" }}>
      {label}
    </span>
  );
}
