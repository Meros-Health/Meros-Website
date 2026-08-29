"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BaseToggle } from "@/components/ui/BaseToggle";
import { SizeToggle } from "@/components/ui/SizeToggle";
import { EMPTY_NUTRITION } from "@/lib/menu/nutrition";
import { formatPrice, formatSurcharge } from "@/lib/menu/calcBowlPrice";
import { ingredientName } from "@/lib/menu/ingredients";
import { getDefaultBaseId } from "@/lib/menu/signatureBase";
import {
  MAX_ADDITIONS,
  MAX_REMOVALS,
  calcSignaturePrice,
  getAdditionPrice,
  isRemovable,
  listAddableGroups,
} from "@/lib/menu/signatureMods";
import { getSignatureItem, getSignaturePrice, getSizeLabel, getSizeTiers, type SignatureItem } from "@/lib/menu/signatures";
import { lockScroll } from "@/lib/scrollLock";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { useCartStore } from "@/store/cartStore";
import { MAX_QUANTITY } from "@/lib/menu/limits";

// One dialog, two jobs, the same rules for both:
//
// - Add: a bowl's "+" opens it before anything is in the cart. The draft is
//   blank: the customer must choose a size and a yogurt, then may add up to
//   MAX_ADDITIONS from the builder's steps and leave out up to MAX_REMOVALS
//   recipe ingredients. Add puts the line in the cart. (Smoothies never come
//   here: one size, vanilla by default, they add in one press.)
// - Edit: a line's Edit button in the cart drawer opens it over the drawer,
//   loaded with what the line holds. Save writes the draft back; the store
//   sanitizes and re-prices.

const MODAL_Z = 135; // above the cart drawer (130), below the page transition cover (140)
// A tap that opened the dialog is often followed by a second one on the same
// spot (a double-tap); for this long after opening, the backdrop ignores it.
const BACKDROP_GRACE_MS = 350;
const PANEL_DURATION = 0.45;
const PANEL_EASE = [0.16, 1, 0.3, 1] as const;

const HAIRLINE = "0.5px solid rgba(41,45,42,0.12)";
const HAIRLINE_STRONG = "0.5px solid rgba(41,45,42,0.28)";

type Mode = "add" | "edit";

type Draft = {
  sizeId: string | undefined;
  baseId: string | undefined;
  additions: string[];
  removals: string[];
};

/** A draft the dialog will submit: both required choices made. */
type CompleteDraft = Draft & { sizeId: string; baseId: string };

/** What a submit came to: closed, or a line of copy the dialog shows and stays open on. */
type SubmitOutcome = { kind: "done" } | { kind: "notice"; message: string };

const AT_MAX_MESSAGE = `This item is already at its maximum of ${MAX_QUANTITY} in your cart.`;
const UNAVAILABLE_MESSAGE = "This item is no longer available as chosen. Close and choose again.";
const NO_YOGURT_MESSAGE = "Choose a yogurt for this bowl.";

export function SignatureModal() {
  // Edit: driven by the line in the cart.
  const editingLineId = useCartStore((s) => s.editingLineId);
  const line = useCartStore((s) => (s.editingLineId ? s.items.find((i) => i.lineId === s.editingLineId) : undefined));
  const editSession = useCartStore((s) => s.editSession);
  const closeEdit = useCartStore((s) => s.closeEdit);
  const updateSignatureLine = useCartStore((s) => s.updateSignatureLine);
  const raiseNotice = useCartStore((s) => s.raiseNotice);
  const editCatalog = line?.kind === "signature" ? getSignatureItem(line.productId) : undefined;
  const editOpen = editingLineId !== null && line !== undefined && editCatalog !== undefined;

  // Add: driven by the product whose "+" was pressed.
  const addingProductId = useCartStore((s) => s.addingProductId);
  const addSession = useCartStore((s) => s.addSession);
  const closeAdd = useCartStore((s) => s.closeAdd);
  const addFromModal = useCartStore((s) => s.addFromModal);
  const addCatalog = addingProductId ? getSignatureItem(addingProductId) : undefined;
  const addOpen = addingProductId !== null && addCatalog !== undefined;

  // The line left the cart (removed here, or in another tab) while the modal
  // was open: there is nothing to save into, so close. Likewise a product the
  // menu no longer has cannot be configured.
  useEffect(() => {
    if (editingLineId !== null && !editOpen) closeEdit();
  }, [editingLineId, editOpen, closeEdit]);
  useEffect(() => {
    if (addingProductId !== null && !addOpen) closeAdd();
  }, [addingProductId, addOpen, closeAdd]);

  return (
    <AnimatePresence>
      {editOpen && line && editCatalog && (
        // Keyed per open, so a reopened line starts from what the cart holds
        // rather than from a draft left behind by a Cancel during the exit.
        <Dialog
          key={`edit:${line.lineId}:${editSession}`}
          mode="edit"
          catalogItem={editCatalog}
          initial={{
            sizeId: line.size?.id ?? Object.keys(editCatalog.sizes)[0],
            // A line persisted before the yogurt became a choice has none; a
            // bowl then starts unselected and Save waits for a pick.
            baseId: line.base ?? getDefaultBaseId(editCatalog),
            additions: line.mods?.additions ?? [],
            removals: line.mods?.removals ?? [],
          }}
          onSubmit={(draft) => {
            const result = updateSignatureLine(line.lineId, {
              sizeId: draft.sizeId,
              base: draft.baseId,
              mods: { additions: draft.additions, removals: draft.removals },
            });
            // The line left the cart between opening and Save (another tab):
            // nothing was written, and the drawer says so rather than the
            // dialog closing as if it had.
            if (result === "missing") {
              raiseNotice([{ kind: "dropped", message: `${line.name} was removed from your cart before your changes could be saved.` }]);
            }
            if (result === "invalid") return { kind: "notice", message: NO_YOGURT_MESSAGE };
            closeEdit();
            return { kind: "done" };
          }}
          onClose={closeEdit}
        />
      )}
      {addOpen && addCatalog && (
        <Dialog
          key={`add:${addCatalog.id}:${addSession}`}
          mode="add"
          catalogItem={addCatalog}
          initial={{ sizeId: undefined, baseId: getDefaultBaseId(addCatalog), additions: [], removals: [] }}
          onSubmit={(draft) => {
            const unitPrice = calcSignaturePrice(addCatalog.id, draft.sizeId, draft, draft.baseId);
            // Guarded by canSubmit; a menu change under the open dialog is the
            // only way here, and then there is nothing priceable to add.
            if (unitPrice === undefined) return { kind: "notice", message: UNAVAILABLE_MESSAGE };
            const result = addFromModal({
              kind: "signature",
              productId: addCatalog.id,
              name: addCatalog.name,
              size: { id: draft.sizeId, label: getSizeLabel(addCatalog.category, draft.sizeId) },
              base: draft.baseId,
              mods: { additions: draft.additions, removals: draft.removals },
              nutrition: { ...EMPTY_NUTRITION },
              quantity: 1,
              unitPrice,
            });
            if (result === "at-max") return { kind: "notice", message: AT_MAX_MESSAGE };
            if (result === "invalid") return { kind: "notice", message: UNAVAILABLE_MESSAGE };
            return { kind: "done" };
          }}
          onClose={closeAdd}
        />
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------

function Dialog({
  mode,
  catalogItem,
  initial,
  onSubmit,
  onClose,
}: {
  mode: Mode;
  catalogItem: SignatureItem;
  initial: Draft;
  onSubmit: (draft: CompleteDraft) => SubmitOutcome;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  const s = (seconds: number) => (reduced ? 0 : seconds);
  const titleId = useId();
  const recipeId = useId();
  const additionsId = useId();

  const [sizeId, setSizeId] = useState<string | undefined>(initial.sizeId);
  const [baseId, setBaseId] = useState<string | undefined>(initial.baseId);
  const [additions, setAdditions] = useState<string[]>(initial.additions);
  const [removals, setRemovals] = useState<string[]>(initial.removals);
  const [notice, setNotice] = useState<string | null>(null);
  const openedAt = useRef(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<Element | null>(null);

  const groups = useMemo(() => listAddableGroups(catalogItem), [catalogItem]);
  const hasSizes = getSizeTiers(catalogItem.category).length > 1;
  const noun = catalogItem.category === "bowl" ? "bowl" : "smoothie";

  const basePrice = sizeId === undefined ? undefined : getSignaturePrice(catalogItem.id, sizeId);
  const price = sizeId === undefined ? undefined : calcSignaturePrice(catalogItem.id, sizeId, { additions, removals }, baseId);
  const delta = price !== undefined && basePrice !== undefined ? price - basePrice : 0;
  const canSubmit = price !== undefined && sizeId !== undefined && baseId !== undefined;

  const atAddCap = additions.length >= MAX_ADDITIONS;
  const atRemoveCap = removals.length >= MAX_REMOVALS;

  // Scroll lock is reference counted with the drawer's; released on unmount.
  useEffect(() => lockScroll(), []);

  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  const handleBackdropClick = () => {
    if (performance.now() - openedAt.current < BACKDROP_GRACE_MS) return;
    onClose();
  };

  // Focus: the Close button once the panel has settled; back to whatever
  // opened the modal (a "+" or a line's Edit button) when it unmounts.
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

  useEffect(() => {
    setNotice(null);
  }, [sizeId, baseId, additions, removals]);

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

  const handleSubmit = () => {
    if (sizeId === undefined || baseId === undefined || price === undefined) return;
    const outcome = onSubmit({ sizeId, baseId, additions, removals });
    setNotice(outcome.kind === "notice" ? outcome.message : null);
  };

  const eyebrow = mode === "add" ? "Add" : "Edit";
  const submitLabel = mode === "add" ? "Add to cart" : "Save";
  const priceText =
    sizeId === undefined ? "Choose a size" : price === undefined ? "Unavailable" : formatPrice(price);

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
        onClick={handleBackdropClick}
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
        data-signature-modal={mode}
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
            <p className="font-body-caps text-[10px] tracking-widest text-grapefruit-text">{eyebrow}</p>
            <h2 id={titleId} className="font-headline text-midnight leading-none mt-1" style={{ fontSize: "1.35rem" }}>
              {catalogItem.name}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label={mode === "add" ? "Close" : "Close edit"}
            onClick={onClose}
            className="font-body-caps text-[10px] tracking-widest text-juniper px-3 py-2 min-h-11 transition-opacity hover:opacity-70"
          >
            Close
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" data-lenis-prevent>
          {hasSizes && (
            <section>
              <RequiredHeading title="Size" chosen={sizeId !== undefined} />
              <SizeToggle category={catalogItem.category} value={sizeId} onChange={setSizeId} />
            </section>
          )}

          <section>
            <RequiredHeading title="Yogurt" chosen={baseId !== undefined} />
            <BaseToggle value={baseId} onChange={setBaseId} />
          </section>

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
        {/* Below md the sheet sits on the bottom edge, so its padding grows by
            the home indicator's inset; the centred dialog from md up does not. */}
        <div className={`px-6 py-5 pb-[calc(1.25rem_+_env(safe-area-inset-bottom,0px))] md:pb-5`} style={{ borderTop: HAIRLINE }}>
          {notice && (
            <p role="alert" data-modal-notice className="font-body-mixed text-xs text-grapefruit-text pb-4">
              {notice}
            </p>
          )}
          <div className="flex justify-between pb-4">
            <span className="font-body-caps text-[11px] text-midnight">Item price</span>
            <span className="font-body-caps text-[11px] text-midnight" data-edit-price>
              {priceText}
              {delta > 0 && <span className="text-juniper ml-2">({formatSurcharge(delta)})</span>}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 font-body-caps text-[10px] tracking-widest py-3 min-h-11 transition-opacity hover:opacity-80"
              style={{ background: "transparent", color: "var(--color-midnight)", border: HAIRLINE_STRONG }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="flex-1 font-body-caps text-[10px] tracking-widest py-3 min-h-11 transition-opacity hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "var(--color-midnight)",
                color: "var(--color-cream)",
                border: "0.5px solid var(--color-midnight)",
              }}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------

/** Heading for a choice the dialog will not submit without. */
function RequiredHeading({ title, chosen }: { title: string; chosen: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 mb-3">
      <p className="font-body-caps text-[10px] tracking-widest text-midnight">{title}</p>
      {!chosen && <p className="font-body-mixed text-xs text-grapefruit-text">Choose one</p>}
    </div>
  );
}

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

// min-h-10: a 40px chip clears WCAG 2.2's 24px target floor with room; the
// 44px floor is kept for the primary controls, where a wrap of forty chips
// that tall would read as bloated.
const CHIP_CLASS = "font-body-caps text-[10px] tracking-widest px-3 py-2 min-h-10 transition-colors duration-200 disabled:cursor-not-allowed";

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

/**
 * A recipe ingredient that cannot be left out. Recipes hold toppings only
 * now (the yogurt is chosen above), so this is the backstop for a recipe
 * that names a select:"one" ingredient, which the validator forbids.
 */
function StaticChip({ label }: { label: string }) {
  return (
    <span className={CHIP_CLASS} style={{ border: HAIRLINE, color: "var(--color-juniper)" }}>
      {label}
    </span>
  );
}
