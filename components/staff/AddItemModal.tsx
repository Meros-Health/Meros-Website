"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lockScroll } from "@/lib/scrollLock";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { PANEL_EASE } from "@/lib/motion";
import { Z } from "@/lib/design/layers";
import { MAX_NAME_LENGTH, STAFF_SECTIONS } from "@/lib/staff/customItems";

// "Add an item" for the staff inventory board. A bottom sheet on phones,
// centred from md up, the same shape as the cart's signature dialog.
//
// Motion here is interactive feedback on a work surface, not a scroll reveal,
// so it gets a short front-loaded open rather than the house 1.0s to 1.4s
// entrance: a server tapped "+" and is waiting to type.
//
// The dialog stays open on a rejected submit and keeps what was typed. The
// common rejection is "that is already on the board, under Fruits", which is
// an answer, not an error, and closing the dialog would throw it away along
// with the name.

const PANEL_S = 0.28;
const BACKDROP_S = 0.18;

const HAIRLINE = "0.5px solid var(--rule-midnight)";
const HAIRLINE_STRONG = "0.5px solid var(--rule-strong-midnight)";

const FIELD_CLASS =
  "mt-1.5 w-full border border-midnight/rule bg-transparent px-3 py-2.5 text-sm text-midnight " +
  "outline-none focus:border-midnight md:text-caption";

/** Returns an error to show, or null when the item was added and the dialog may close. */
export type AddItemSubmit = (name: string, section: string) => Promise<string | null>;

export function AddItemModal({
  open,
  initialSection,
  onClose,
  onSubmit,
}: {
  open: boolean;
  initialSection: string;
  onClose: () => void;
  onSubmit: AddItemSubmit;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <AddItemDialog initialSection={initialSection} onClose={onClose} onSubmit={onSubmit} />
      ) : null}
    </AnimatePresence>
  );
}

// Split so every piece of state is born with the dialog and dies with it: no
// stale name or error survives a close and reopen.
function AddItemDialog({
  initialSection,
  onClose,
  onSubmit,
}: {
  initialSection: string;
  onClose: () => void;
  onSubmit: AddItemSubmit;
}) {
  const [name, setName] = useState("");
  const [section, setSection] = useState(initialSection);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const nameId = useId();
  const sectionId = useId();
  const reduced = useReducedMotion();
  const s = (seconds: number) => (reduced ? 0 : seconds);

  useFocusTrap(panelRef, true);
  useEffect(() => lockScroll(), []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const message = await onSubmit(name, section);
    if (message === null) {
      onClose();
      return;
    }
    setError(message);
    setSaving(false);
  };

  const ingredientSections = STAFF_SECTIONS.filter((entry) => entry.tab === "ingredients");
  const supplySections = STAFF_SECTIONS.filter((entry) => entry.tab === "supplies");

  return (
    <div
      className="flex items-end justify-center md:items-center md:p-6"
      style={{ position: "fixed", inset: 0, zIndex: Z.staffModal }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: s(BACKDROP_S), ease: "easeOut" }}
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--scrim-midnight)",
        }}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-staff-add-modal
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: s(PANEL_S), ease: PANEL_EASE }}
        className="relative flex w-full flex-col md:max-w-[420px]"
        style={{
          background: "var(--color-cream)",
          borderTop: HAIRLINE_STRONG,
          boxShadow: "0 -8px 32px var(--rule-midnight)",
        }}
      >
        <div className="px-6 py-5" style={{ borderBottom: HAIRLINE }}>
          <h2 id={titleId} className="font-headline text-xl text-midnight">
            Add an item
          </h2>
          <p className="mt-1 text-note text-juniper">
            Tracked on this board only. It does not reach the menu or the ordering page.
          </p>
        </div>

        <form
          className="px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor={nameId} className="block text-caption text-midnight">
            Item name
          </label>
          <input
            id={nameId}
            // The one field staff came here to fill; nothing else should take focus.
            autoFocus
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (error) setError(null);
            }}
            maxLength={MAX_NAME_LENGTH}
            placeholder="Raspberry Chia Pudding"
            autoComplete="off"
            className={FIELD_CLASS}
            aria-describedby={error ? `${nameId}-error` : undefined}
          />

          <label htmlFor={sectionId} className="mt-5 block text-caption text-midnight">
            Section
          </label>
          <select
            id={sectionId}
            value={section}
            onChange={(event) => setSection(event.target.value)}
            className={FIELD_CLASS}
          >
            <optgroup label="Ingredients">
              {ingredientSections.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Supplies">
              {supplySections.map((entry) => (
                <option key={entry.name} value={entry.name}>
                  {entry.name}
                </option>
              ))}
            </optgroup>
          </select>

          {error ? (
            <p id={`${nameId}-error`} role="alert" className="mt-4 text-note text-grapefruit-text">
              {error}
            </p>
          ) : null}

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-11 border border-midnight/rule px-4 text-caption text-midnight/70 transition-colors hover:bg-midnight/veil"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || name.trim().length === 0}
              className="min-h-11 border border-emphasis border-midnight bg-midnight px-5 text-caption font-semibold text-cream transition-opacity disabled:opacity-40"
            >
              {saving ? "Adding…" : "Add item"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
