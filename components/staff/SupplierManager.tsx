"use client";

import { useEffect, useState } from "react";
import { MAX_NAME_LENGTH } from "@/lib/staff/customItems";
import { SUPPLIER_KINDS, type SupplierKind } from "@/lib/staff/purchases";

// The supplier list, on the ordering page. Collapsed until someone needs it:
// it is edited a few times a year and the orders above it are edited daily.
//
// Removing archives rather than deletes, and the copy says so. A supplier with
// a year of prices behind it cannot be removed without taking the prices with
// it, so "Remove" here means "stop offering this", the same as the board's
// "Not carrying" drawer.

const CONFIRM_MS = 4_000;

const FIELD_CLASS =
  "w-full border border-midnight/rule bg-transparent px-3 py-2.5 text-sm text-midnight " +
  "outline-none focus:border-midnight md:text-caption";

const KIND_LABELS: Record<SupplierKind, string> = {
  wholesale: "Wholesale",
  club: "Club",
  retail: "Retail",
  local: "Local",
  marketplace: "Marketplace",
};

export type Supplier = { id: string; name: string; kind: SupplierKind | null; archived: boolean };

export function SupplierManager({
  suppliers,
  onAdd,
  onRemove,
}: {
  suppliers: Supplier[];
  onAdd: (name: string, kind: SupplierKind) => Promise<string | null>;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<SupplierKind>("wholesale");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const live = suppliers.filter((supplier) => !supplier.archived);

  const submit = async () => {
    if (saving || !name.trim()) return;
    setSaving(true);
    setError(null);
    const message = await onAdd(name, kind);
    if (message === null) setName("");
    else setError(message);
    setSaving(false);
  };

  return (
    <section className="mt-10 border-t border-midnight/rule-strong pt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        // Bordered rather than the plain disclosure text the board's "Not
        // carrying" drawer uses. This one is a place to go and do something,
        // not a footnote, and it is the only route to editing the list the
        // order form reads from. It stays secondary to "Log an order": a
        // second filled button would make the page ask twice.
        className="inline-flex min-h-11 items-center gap-2 border border-midnight/rule px-4 text-caption font-semibold text-midnight transition-colors hover:bg-midnight/veil"
      >
        <span aria-hidden>{open ? "−" : "+"}</span>
        Suppliers ({live.length})
      </button>

      {open ? (
        <div className="pb-2">
          <p className="max-w-prose text-note text-juniper">
            Removing a supplier takes it off the list without touching the orders it is already on,
            so past prices keep their name.
          </p>

          <ul className="mt-3 md:columns-2 md:gap-6">
            {live.map((supplier) => (
              <li
                key={supplier.id}
                className="flex break-inside-avoid items-center justify-between gap-3 py-1"
              >
                <span className="min-w-0 flex-1 text-sm md:text-caption">
                  {supplier.name}
                  {supplier.kind ? (
                    <span className="text-juniper"> · {KIND_LABELS[supplier.kind]}</span>
                  ) : null}
                </span>
                {confirming === supplier.id ? (
                  <button
                    type="button"
                    onClick={() => onRemove(supplier.id)}
                    aria-label={`Confirm removing ${supplier.name}`}
                    className="min-h-11 shrink-0 border border-emphasis border-status-out bg-status-out/veil px-2 text-xs font-semibold text-status-out md:h-8 md:min-h-0"
                  >
                    Remove?
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirming(supplier.id)}
                    aria-label={`Remove ${supplier.name}`}
                    className="min-h-11 w-8 shrink-0 border border-midnight/rule text-sm text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0"
                  >
                    <span aria-hidden>−</span>
                  </button>
                )}
              </li>
            ))}
          </ul>

          <form
            className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-start"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (error) setError(null);
              }}
              maxLength={MAX_NAME_LENGTH}
              placeholder="New supplier"
              aria-label="New supplier name"
              autoComplete="off"
              className={`${FIELD_CLASS} sm:flex-1`}
            />
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as SupplierKind)}
              aria-label="Supplier kind"
              className={`${FIELD_CLASS} sm:w-40`}
            >
              {SUPPLIER_KINDS.map((option) => (
                <option key={option} value={option}>
                  {KIND_LABELS[option]}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving || name.trim().length === 0}
              className="min-h-11 border border-midnight/rule px-4 text-caption text-midnight transition-colors hover:bg-midnight/veil disabled:opacity-40"
            >
              {saving ? "Adding…" : "Add"}
            </button>
          </form>

          {error ? (
            <p role="alert" className="mt-2 text-note text-grapefruit-text">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
