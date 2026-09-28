import Link from "next/link";
import { EMPTY } from "@/lib/design/staffLayout";
import { PACK_MEASURES } from "@/lib/staff/purchases";

// The shared furniture of the staff portal: the way out, the two formatters
// both pages need, and the three primitives that put a value in a fixed slot.
//
// It exists because the board and the ordering log are two views of the same
// table and were drifting apart: each had its own copy of "3 x 1 kg Bag", its
// own back link, and its own idea of how wide a page should be. One file means
// a column added to one surface reads the same on the other.
//
// The widths and the grid templates live in lib/design/staffLayout.ts, with the
// rule they follow and the test that holds them to it.

/** A value, or the placeholder: the slot is occupied either way. */
export function orEmpty(value: string | null | undefined): string {
  return value && value.length > 0 ? value : EMPTY;
}

/** "Sep 21". Dates in this portal are days; nothing here is scheduled to the minute. */
export function formatDay(iso: string | null): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(then);
}

/**
 * "3 x 1 kg Bag", or "3 x Bag" when nobody recorded what a bag holds. The unit
 * names the container and the pack size says what is in it, which is the only
 * way two suppliers' prices compare.
 */
export function packLabel(row: {
  quantity: number;
  unit: string;
  packSizeG: number | null;
  packSizeCount: number | null;
}): string {
  const size = row.packSizeG
    ? row.packSizeG >= 1000
      ? `${+(row.packSizeG / 1000).toFixed(3)} ${PACK_MEASURES.kg.label}`
      : `${+row.packSizeG.toFixed(1)} ${PACK_MEASURES.g.label}`
    : row.packSizeCount
      ? `${+row.packSizeCount.toFixed(0)} ct`
      : null;
  return `${+row.quantity.toFixed(2)} × ${size ? `${size} ` : ""}${row.unit}`;
}

/**
 * One value in a row or a card. Truncation with the full string on hover is the
 * trade the fixed widths buy: the tracker's own names run to "PET Clear Lid for
 * Rectangular Food Box", and letting one of those set a column's width would
 * push the status chips off the screen for all 109 rows.
 *
 * A missing value is drawn at a quarter opacity rather than omitted. It is the
 * difference between "nobody recorded a price" and "this row has no price
 * column", and only one of those is true.
 */
export function Cell({
  value,
  className = "",
  numeric = false,
}: {
  value: string | null | undefined;
  className?: string;
  numeric?: boolean;
}) {
  const text = orEmpty(value);
  const faint = text === EMPTY;
  return (
    <span
      title={faint ? undefined : text}
      className={`block truncate text-note ${numeric ? "tabular-nums" : ""} ${
        faint ? "text-midnight/25" : "text-midnight/70"
      } ${className}`}
    >
      {text}
    </span>
  );
}

/** The label on a board column or a card field. Micro caps, quiet, never a heading. */
export function ColumnLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`block truncate text-label uppercase tracking-micro text-juniper ${className}`}
    >
      {children}
    </span>
  );
}

/** The only route out of the portal: it carries no site nav or footer. */
export function StaffBackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center gap-2 self-start text-caption text-juniper underline-offset-4 hover:underline"
    >
      <span aria-hidden>&larr;</span>
      {children}
    </Link>
  );
}
