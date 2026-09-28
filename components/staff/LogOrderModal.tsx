"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { lockScroll } from "@/lib/scrollLock";
import { useFocusTrap } from "@/lib/useFocusTrap";
import { PANEL_EASE } from "@/lib/motion";
import { Z } from "@/lib/design/layers";
import { INGREDIENT_GROUPS, SUPPLY_GROUPS } from "@/lib/staff/catalog";
import {
  MASS_UNITS,
  MAX_NOTE_LENGTH,
  PACK_MEASURES,
  PURCHASE_UNITS,
  formatCents,
  type PackMeasure,
} from "@/lib/staff/purchases";

// "Log an order" for the staff ordering page. Same shape as the board's
// add-item dialog: a bottom sheet on phones, centred from md up.
//
// Motion is interactive feedback on a work surface, not a scroll reveal, so it
// gets a short front-loaded open rather than the house 1.0s to 1.4s entrance.
//
// Two things here are the whole point of the feature and worth not losing:
//
//   The item is a selector, never free text. A typed item name would make
//   "Sliced almonds" and "sliced almonds " two different histories, and the
//   question this is built to answer is per item.
//
//   Picking an item fills the form in from the last time it was ordered.
//   Nothing else recovers the supplier, the pack size and the price without
//   somebody going and looking them up, which is the work this replaces. It is
//   a prefill and not a default: every field stays editable, because the
//   frozen and the fresh of the same fruit come from different suppliers at
//   different prices and share one row on the board.

const PANEL_S = 0.28;
const BACKDROP_S = 0.18;

const HAIRLINE = "0.5px solid var(--rule-midnight)";
const HAIRLINE_STRONG = "0.5px solid var(--rule-strong-midnight)";

const FIELD_CLASS =
  "mt-1.5 w-full border border-midnight/rule bg-transparent px-3 py-2.5 text-sm text-midnight " +
  "outline-none focus:border-midnight md:text-caption";

const LABEL_CLASS = "block text-caption text-midnight";

export type SupplierOption = { id: string; name: string };

export type LastOrder = {
  supplierId: string | null;
  unit: string;
  packSizeG: number | null;
  packSizeCount: number | null;
  packPriceCents: number | null;
  orderedAt: string;
  costPerKgCents: number | null;
};

export type LogOrderDraft = {
  itemId: string;
  quantity: string;
  unit: string;
  packSize: string;
  packMeasure: PackMeasure;
  price: string;
  supplierId: string;
  orderedAt: string;
  notes: string;
  receivedNow: boolean;
};

/** Returns an error to show, or null when the order was logged and the dialog may close. */
export type LogOrderSubmit = (draft: LogOrderDraft) => Promise<string | null>;

export function LogOrderModal({
  open,
  suppliers,
  lastByItem,
  onClose,
  onSubmit,
}: {
  open: boolean;
  suppliers: SupplierOption[];
  lastByItem: Record<string, LastOrder>;
  onClose: () => void;
  onSubmit: LogOrderSubmit;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <LogOrderDialog
          suppliers={suppliers}
          lastByItem={lastByItem}
          onClose={onClose}
          onSubmit={onSubmit}
        />
      ) : null}
    </AnimatePresence>
  );
}

function todayInput(): string {
  // The date input wants local calendar date, not a UTC instant: on a Vancouver
  // evening those are different days, and the wrong one is the one that makes
  // an order look like it was placed tomorrow.
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** The pack size a previous order implies, as the two fields the form shows. */
function packFieldsFrom(last: LastOrder | undefined): { size: string; measure: PackMeasure } {
  if (last?.packSizeG) {
    // Re-expressed in kilos when it divides cleanly, because "1 kg" is what
    // somebody reads off the bag and "1000 g" is not.
    return last.packSizeG >= 1000
      ? { size: String(last.packSizeG / 1000), measure: "kg" }
      : { size: String(last.packSizeG), measure: "g" };
  }
  if (last?.packSizeCount) return { size: String(last.packSizeCount), measure: "count" };
  return { size: "", measure: "kg" };
}

// Split so every piece of state is born with the dialog and dies with it: no
// half-typed order survives a close and reopen.
function LogOrderDialog({
  suppliers,
  lastByItem,
  onClose,
  onSubmit,
}: {
  suppliers: SupplierOption[];
  lastByItem: Record<string, LastOrder>;
  onClose: () => void;
  onSubmit: LogOrderSubmit;
}) {
  const [itemId, setItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState<string>("Case");
  const [packSize, setPackSize] = useState("");
  const [packMeasure, setPackMeasure] = useState<PackMeasure>("kg");
  const [price, setPrice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [orderedAt, setOrderedAt] = useState(todayInput);
  const [notes, setNotes] = useState("");
  const [receivedNow, setReceivedNow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const fieldId = useId();
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

  const last = itemId ? lastByItem[itemId] : undefined;

  /** Fill the form in from the last order of whatever was just picked. */
  const pickItem = (id: string) => {
    setItemId(id);
    if (error) setError(null);
    const previous = lastByItem[id];
    if (!previous) return;
    setUnit(previous.unit);
    setSupplierId(previous.supplierId ?? "");
    const pack = packFieldsFrom(previous);
    setPackSize(pack.size);
    setPackMeasure(pack.measure);
    setPrice(previous.packPriceCents === null ? "" : (previous.packPriceCents / 100).toFixed(2));
  };

  /**
   * kg and lb already state a mass, so the pack size is the quantity. Filling
   * it saves the one entry most likely to be skipped, and skipping it is what
   * costs the row its per-kilo comparison.
   */
  const pickUnit = (next: string) => {
    setUnit(next);
    const implied = MASS_UNITS[next as keyof typeof MASS_UNITS];
    if (implied && !packSize) {
      setPackSize("1");
      setPackMeasure(implied);
    }
  };

  const priceCents = useMemo(() => {
    const value = Number(price);
    return price.trim() === "" || !Number.isFinite(value) ? null : Math.round(value * 100);
  }, [price]);

  const quantityValue = Number(quantity);

  // What the entry adds up to, shown as it is typed. The per-kilo line is the
  // arithmetic currently being done by hand in a spreadsheet's Notes column.
  const summary = useMemo(() => {
    const parts: string[] = [];
    if (priceCents !== null && Number.isFinite(quantityValue) && quantityValue > 0) {
      parts.push(`Total ${formatCents(priceCents * quantityValue)}`);
    }
    const size = Number(packSize);
    if (priceCents !== null && Number.isFinite(size) && size > 0) {
      const grams = PACK_MEASURES[packMeasure].grams;
      if (grams) {
        parts.push(`${formatCents((priceCents / (size * grams)) * 1000)}/kg`);
      } else {
        parts.push(`${formatCents(priceCents / size)} each`);
      }
    }
    return parts.join(" · ");
  }, [priceCents, quantityValue, packSize, packMeasure]);

  // Only worth showing when it can actually be compared: same item, both
  // priced per kilo. A bare "was $18.99" across two different pack sizes is
  // the misleading comparison this feature exists to stop.
  const comparison = useMemo(() => {
    if (!last?.costPerKgCents || priceCents === null) return null;
    const size = Number(packSize);
    const grams = PACK_MEASURES[packMeasure].grams;
    if (!grams || !Number.isFinite(size) || size <= 0) return null;
    const nowPerKg = (priceCents / (size * grams)) * 1000;
    const change = nowPerKg - last.costPerKgCents;
    const when = new Date(last.orderedAt).toLocaleDateString("en-CA", {
      month: "short",
      day: "numeric",
    });
    if (Math.abs(change) < 1) return `Same as ${when}, ${formatCents(last.costPerKgCents)}/kg`;
    const direction = change > 0 ? "up from" : "down from";
    return `${direction} ${formatCents(last.costPerKgCents)}/kg on ${when}`;
  }, [last, priceCents, packSize, packMeasure]);

  const submit = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const message = await onSubmit({
      itemId,
      quantity,
      unit,
      packSize,
      packMeasure,
      price,
      supplierId,
      orderedAt,
      notes,
      receivedNow,
    });
    if (message === null) {
      onClose();
      return;
    }
    setError(message);
    setSaving(false);
  };

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
        style={{ position: "absolute", inset: 0, background: "var(--scrim-midnight)" }}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-staff-order-modal
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: s(PANEL_S), ease: PANEL_EASE }}
        className="relative flex max-h-[90dvh] w-full flex-col overflow-y-auto md:max-w-[460px]"
        style={{
          background: "var(--color-cream)",
          borderTop: HAIRLINE_STRONG,
          boxShadow: "0 -8px 32px var(--rule-midnight)",
        }}
      >
        <div className="px-6 py-5" style={{ borderBottom: HAIRLINE }}>
          <h2 id={titleId} className="font-headline text-xl text-midnight">
            Log an order
          </h2>
          <p className="mt-1 text-note text-juniper">
            Recorded when it was ordered. Mark it arrived when it lands, and the board closes it
            when the item runs out.
          </p>
        </div>

        <form
          className="px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label htmlFor={`${fieldId}-item`} className={LABEL_CLASS}>
            Item
          </label>
          <select
            id={`${fieldId}-item`}
            autoFocus
            value={itemId}
            onChange={(event) => pickItem(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Choose an item…</option>
            {[...INGREDIENT_GROUPS, ...SUPPLY_GROUPS].map((group) => (
              <optgroup key={group.name} label={group.name}>
                {group.items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${fieldId}-qty`} className={LABEL_CLASS}>
                How many
              </label>
              <input
                id={`${fieldId}-qty`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-unit`} className={LABEL_CLASS}>
                Unit
              </label>
              <select
                id={`${fieldId}-unit`}
                value={unit}
                onChange={(event) => pickUnit(event.target.value)}
                className={FIELD_CLASS}
              >
                {PURCHASE_UNITS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <label htmlFor={`${fieldId}-size`} className={LABEL_CLASS}>
                Pack size <span className="text-juniper">(optional)</span>
              </label>
              <input
                id={`${fieldId}-size`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={packSize}
                onChange={(event) => setPackSize(event.target.value)}
                placeholder="1"
                className={FIELD_CLASS}
              />
            </div>
            <div>
              <label htmlFor={`${fieldId}-measure`} className={LABEL_CLASS}>
                Measured in
              </label>
              <select
                id={`${fieldId}-measure`}
                value={packMeasure}
                onChange={(event) => setPackMeasure(event.target.value as PackMeasure)}
                className={FIELD_CLASS}
              >
                {(Object.keys(PACK_MEASURES) as PackMeasure[]).map((option) => (
                  <option key={option} value={option}>
                    {PACK_MEASURES[option].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="mt-1.5 text-note text-juniper">
            What one {unit.toLowerCase()} holds. Fill it in and prices become comparable between
            suppliers.
          </p>

          <label htmlFor={`${fieldId}-price`} className={`mt-5 ${LABEL_CLASS}`}>
            Price per {unit.toLowerCase()} <span className="text-juniper">(optional)</span>
          </label>
          <input
            id={`${fieldId}-price`}
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0.00"
            className={FIELD_CLASS}
          />
          {summary ? (
            <p className="mt-1.5 text-note text-midnight/70">
              {summary}
              {comparison ? <span className="text-juniper"> · {comparison}</span> : null}
            </p>
          ) : null}

          <label htmlFor={`${fieldId}-supplier`} className={`mt-5 ${LABEL_CLASS}`}>
            Supplier
          </label>
          <select
            id={`${fieldId}-supplier`}
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">Not recorded</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <label htmlFor={`${fieldId}-date`} className={`mt-5 ${LABEL_CLASS}`}>
            Date ordered
          </label>
          <input
            id={`${fieldId}-date`}
            type="date"
            value={orderedAt}
            onChange={(event) => setOrderedAt(event.target.value)}
            className={FIELD_CLASS}
          />

          <label className="mt-4 flex min-h-11 items-center gap-2.5 text-caption text-midnight">
            <input
              type="checkbox"
              checked={receivedNow}
              onChange={(event) => setReceivedNow(event.target.checked)}
              className="size-4 accent-[var(--color-midnight)]"
            />
            It is already here
          </label>

          <label htmlFor={`${fieldId}-notes`} className={`mt-4 ${LABEL_CLASS}`}>
            Note <span className="text-juniper">(optional)</span>
          </label>
          <input
            id={`${fieldId}-notes`}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Invoice 26076"
            autoComplete="off"
            className={FIELD_CLASS}
          />

          {error ? (
            <p role="alert" className="mt-4 text-note text-grapefruit-text">
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
              disabled={saving || itemId === ""}
              className="min-h-11 border border-emphasis border-midnight bg-midnight px-5 text-caption font-semibold text-cream transition-opacity disabled:opacity-40"
            >
              {saving ? "Saving…" : "Log order"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
