"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Reveal } from "@/components/ui/ScrollReveal";
import { LogOrderModal, type LogOrderSubmit } from "@/components/staff/LogOrderModal";
import { SupplierManager, type Supplier } from "@/components/staff/SupplierManager";
import { Cell, ColumnLabel, StaffBackLink, formatDay, packLabel } from "@/components/staff/staffUi";
import { CARD_FIELDS, STAFF_PAGE } from "@/lib/design/staffLayout";
import {
  MS_PER_DAY,
  SPEND_CLASS_LABELS,
  STALE_IN_TRANSIT_DAYS,
  formatCents,
  type SpendClass,
  type SupplierKind,
} from "@/lib/staff/purchases";

// The ordering log (/staff/ordering): what is on order now, and what every
// past order cost and how long it lasted.
//
// A board of four columns, one per state, left to right in the order an order
// actually travels: on the way, in use, finished, and the tracker history
// behind all of it. It was two stacked lists, Current and Archive, which was
// fine at eleven rows and unreadable at two hundred: the one question this page
// answers is "where is everything", and a list answers "what happened next".
// Columns make the state the position, so the answer is a glance rather than a
// scroll, and each column scrolls on its own so a long archive cannot bury a
// delivery that is late.
//
// Cards, not table rows. Unlike the inventory board, where every row carries
// the same eight fields and comparison down a column is the whole point, an
// order is read one at a time: what it was, what it cost, when it moved. So
// each field is labelled and sits in a fixed slot, and a field nobody filled
// in still holds its place rather than sliding the one below it up.
//
// Polling matches the board: every 10 seconds and whenever the tab regains
// focus, with in-flight writes holding off the poll so a tap is never stomped
// by a refresh that started before it.
//
// Nothing here closes an order in the normal case. Marking an item Out on the
// board does that (app/staff/items/route.ts), because that is a tap someone
// already makes. The controls here are for the cases the board cannot say.

const POLL_MS = 10_000;
const CONFIRM_MS = 4_000;

type Duration = { days: number; approximate: boolean } | null;

type Purchase = {
  id: string;
  itemId: string;
  itemName: string;
  supplierId: string | null;
  quantity: number;
  unit: string;
  packSizeG: number | null;
  packSizeCount: number | null;
  packPriceCents: number | null;
  orderedAt: string;
  receivedAt: string | null;
  exhaustedAt: string | null;
  notes: string | null;
  state: "on-the-way" | "in-use" | "exhausted" | "imported";
  duration: Duration;
  totalCents: number | null;
  costPerKgCents: number | null;
  costPerCountCents: number | null;
  spendClass: SpendClass;
  imported: boolean;
};

/** One class of spend with no board item behind it. */
type OffBoard = { spendClass: SpendClass; purchases: number; cents: number };

type LastOrder = {
  supplierId: string | null;
  unit: string;
  packSizeG: number | null;
  packSizeCount: number | null;
  packPriceCents: number | null;
  orderedAt: string;
  costPerKgCents: number | null;
};

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / MS_PER_DAY);
}

/** "$4.50/kg", or "$0.23 a piece", or nothing: whichever axis the pack was sold on. */
function rateLabel(row: Purchase): string | null {
  const perKg = formatCents(row.costPerKgCents);
  if (perKg) return `${perKg}/kg`;
  const perCount = formatCents(row.costPerCountCents);
  return perCount ? `${perCount} a piece` : null;
}

/** "12 days", and says so when the number is measured from the order date. */
function durationLabel(duration: Duration): string | null {
  if (!duration) return null;
  const days = `${duration.days} ${duration.days === 1 ? "day" : "days"}`;
  return duration.approximate ? `${days}, approximate` : days;
}

export function OrderLog() {
  const [current, setCurrent] = useState<Purchase[]>([]);
  const [archive, setArchive] = useState<Purchase[]>([]);
  const [lastByItem, setLastByItem] = useState<Record<string, LastOrder>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [offBoard, setOffBoard] = useState<OffBoard[]>([]);
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable">("loading");
  const [revealed, setRevealed] = useState(false);
  const [logging, setLogging] = useState(false);
  const inflight = useRef(0);
  const logTrigger = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [ordersRes, suppliersRes] = await Promise.all([
        fetch("/staff/purchases", { cache: "no-store" }),
        fetch("/staff/suppliers", { cache: "no-store" }),
      ]);
      if (ordersRes.status === 404) {
        setPhase("unavailable");
        return;
      }
      if (!ordersRes.ok) return;
      const data = (await ordersRes.json()) as {
        current: Purchase[];
        archive: Purchase[];
        lastByItem: Record<string, LastOrder>;
        offBoard: OffBoard[];
      };
      if (inflight.current > 0) return;
      setCurrent(data.current ?? []);
      setArchive(data.archive ?? []);
      setLastByItem(data.lastByItem ?? {});
      setOffBoard(data.offBoard ?? []);
      if (suppliersRes.ok) {
        const list = (await suppliersRes.json()) as { suppliers: Supplier[] };
        setSuppliers(list.suppliers ?? []);
      }
      setPhase("ready");
    } catch {
      // Transient network failure: keep what we have, the next poll retries.
    }
  }, []);

  useEffect(() => {
    setRevealed(true);
    void refresh();
    const interval = setInterval(() => void refresh(), POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refresh]);

  const settle = useCallback(() => {
    inflight.current -= 1;
    if (inflight.current === 0) void refresh();
  }, [refresh]);

  const act = useCallback(
    (id: string, action: "receive" | "exhaust" | "reopen") => {
      inflight.current += 1;
      void fetch("/staff/purchases", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      })
        .catch(() => undefined)
        .then(settle);
    },
    [settle]
  );

  const removeOrder = useCallback(
    (id: string) => {
      setCurrent((prev) => prev.filter((row) => row.id !== id));
      setArchive((prev) => prev.filter((row) => row.id !== id));
      inflight.current += 1;
      void fetch("/staff/purchases", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .catch(() => undefined)
        .then(settle);
    },
    [settle]
  );

  const logOrder = useCallback<LogOrderSubmit>(
    async (draft) => {
      inflight.current += 1;
      try {
        const price = draft.price.trim();
        const size = draft.packSize.trim();
        const res = await fetch("/staff/purchases", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: draft.itemId,
            quantity: Number(draft.quantity),
            unit: draft.unit,
            // Cents are computed here and validated as an integer on the
            // server: money never travels or lands as a float.
            packPriceCents: price === "" ? null : Math.round(Number(price) * 100),
            packSize: size === "" ? null : Number(size),
            packMeasure: draft.packMeasure,
            supplierId: draft.supplierId || null,
            orderedAt: draft.orderedAt,
            notes: draft.notes,
            receivedNow: draft.receivedNow,
          }),
        });
        if (res.status === 201) return null;
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        return body?.error ?? "Could not log that order. Try again.";
      } catch {
        return "Could not reach the ordering log. Check the connection and try again.";
      } finally {
        settle();
      }
    },
    [settle]
  );

  const addSupplier = useCallback(
    async (name: string, kind: SupplierKind) => {
      inflight.current += 1;
      try {
        const res = await fetch("/staff/suppliers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, kind }),
        });
        if (res.status === 201) {
          const created = (await res.json()) as Supplier;
          setSuppliers((prev) => [...prev, created]);
          return null;
        }
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        return body?.error ?? "Could not add that supplier. Try again.";
      } catch {
        return "Could not reach the ordering log. Check the connection and try again.";
      } finally {
        settle();
      }
    },
    [settle]
  );

  const removeSupplier = useCallback(
    (id: string) => {
      setSuppliers((prev) => prev.filter((supplier) => supplier.id !== id));
      inflight.current += 1;
      void fetch("/staff/suppliers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .catch(() => undefined)
        .then(settle);
    },
    [settle]
  );

  const openLog = useCallback((trigger: HTMLElement | null) => {
    logTrigger.current = trigger;
    setLogging(true);
  }, []);

  const closeLog = useCallback(() => {
    setLogging(false);
    logTrigger.current?.focus();
    logTrigger.current = null;
  }, []);

  const supplierNames = useMemo(
    () => new Map(suppliers.map((supplier) => [supplier.id, supplier.name])),
    [suppliers]
  );
  const liveSuppliers = useMemo(
    () => suppliers.filter((supplier) => !supplier.archived),
    [suppliers]
  );

  // The four columns, from the two lists the route sends. `current` is what is
  // still open and `archive` is what is not; the state on each row is what
  // decides which column it belongs in, so the split lives in one place and
  // the server keeps deciding what a state means.
  const onTheWay = current.filter((row) => row.state === "on-the-way");
  const inUse = current.filter((row) => row.state === "in-use");
  const finished = archive.filter((row) => row.state === "exhausted");
  const imported = archive.filter((row) => row.state === "imported");

  if (phase === "unavailable") {
    return (
      <div className={STAFF_PAGE}>
        <StaffBackLink href="/staff">Back to inventory</StaffBackLink>
        <h1 className="mt-6 font-headline text-3xl">Ordering</h1>
        <p className="mt-4 max-w-md text-caption text-midnight/70">
          The ordering log is not switched on in this environment.
        </p>
      </div>
    );
  }

  return (
    <div className={STAFF_PAGE}>
      <Reveal show={revealed} index={0}>
        <header className="flex flex-col gap-1.5">
          <StaffBackLink href="/staff">Back to inventory</StaffBackLink>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-headline text-3xl">Ordering</h1>
            <button
              type="button"
              onClick={(event) => openLog(event.currentTarget)}
              className="min-h-11 border border-emphasis border-midnight bg-midnight px-5 text-caption font-semibold text-cream"
            >
              Log an order
            </button>
          </div>
          <p className="text-note text-juniper">
            {phase === "loading"
              ? "Loading…"
              : `${current.length} on the books · ${finished.length} finished · ${imported.length} from the tracker`}
          </p>
        </header>
      </Reveal>

      <Reveal show={revealed} index={1}>
        <div className="mt-6 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OrderColumn
            title="On the way"
            note="Placed, and not here yet."
            empty="Nothing on order. Log one as it is placed and this fills itself in."
            rows={onTheWay}
            suppliers={supplierNames}
            onAct={act}
            onRemove={removeOrder}
          />
          <OrderColumn
            title="In use"
            note="Arrived and open on the shelf."
            empty="Nothing open. An order lands here when it is marked as arrived."
            rows={inUse}
            suppliers={supplierNames}
            onAct={act}
            onRemove={removeOrder}
          />
          <OrderColumn
            title="Finished"
            note="Ran out, with how long it lasted."
            empty="An order lands here when the board says its item ran out."
            rows={finished}
            suppliers={supplierNames}
            onAct={act}
            onRemove={removeOrder}
          />
          <OrderColumn
            title="From the tracker"
            note="Imported history. No arrival or finish date was ever recorded for these."
            empty="No imported history."
            rows={imported}
            suppliers={supplierNames}
            onAct={act}
            onRemove={removeOrder}
          />
        </div>

        <SupplierManager suppliers={suppliers} onAdd={addSupplier} onRemove={removeSupplier} />
        <OffBoardSpend rows={offBoard} />
      </Reveal>

      <LogOrderModal
        open={logging}
        suppliers={liveSuppliers}
        lastByItem={lastByItem}
        onClose={closeLog}
        onSubmit={logOrder}
      />
    </div>
  );
}

/**
 * One column of the board: its state, how many orders are in it, and what that
 * state means in a line, because "In use" and "Finished" are obvious and "From
 * the tracker" is not.
 *
 * The column scrolls inside itself from md up rather than growing the page. The
 * imported history is two hundred cards and the late delivery is one: a page
 * that scrolls as one thing hides the one behind the two hundred.
 */
function OrderColumn({
  title,
  note,
  empty,
  rows,
  suppliers,
  onAct,
  onRemove,
}: {
  title: string;
  note: string;
  empty: string;
  rows: Purchase[];
  suppliers: Map<string, string>;
  onAct: (id: string, action: "receive" | "exhaust" | "reopen") => void;
  onRemove: (id: string) => void;
}) {
  return (
    <section className="flex min-w-0 flex-col border border-midnight/rule">
      <div className="border-b border-midnight/rule-strong bg-midnight/veil px-3 py-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="truncate font-headline text-body md:text-lg">{title}</h2>
          <p className="shrink-0 text-note tabular-nums text-juniper">{rows.length}</p>
        </div>
        <p className="mt-0.5 text-note text-juniper">{note}</p>
      </div>

      {rows.length === 0 ? (
        <p className="px-3 py-4 text-note text-juniper">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 p-2 md:max-h-[68vh] md:overflow-y-auto">
          {rows.map((row) => (
            <OrderCard
              key={row.id}
              row={row}
              suppliers={suppliers}
              onAct={onAct}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/** One labelled field of a card. Empty is a value here, and it keeps its slot. */
function Field({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string | null;
  numeric?: boolean;
}) {
  return (
    <>
      <dt>
        <ColumnLabel className="leading-5">{label}</ColumnLabel>
      </dt>
      <dd className="min-w-0">
        <Cell value={value} numeric={numeric} className="leading-5" />
      </dd>
    </>
  );
}

const CARD_ACTION =
  "min-h-11 border border-midnight/rule px-3 text-xs tracking-body-mixed text-midnight/70 " +
  "transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0";

/**
 * One order. The item reads first, then nine fields in the same nine places on
 * every card, then the one control this row's state allows.
 *
 * The fields are a definition list because that is what they are: a label and
 * the value it names, which is also what makes the card legible to a screen
 * reader without the column header a table would have given it.
 */
function OrderCard({
  row,
  suppliers,
  onAct,
  onRemove,
}: {
  row: Purchase;
  suppliers: Map<string, string>;
  onAct: (id: string, action: "receive" | "exhaust" | "reopen") => void;
  onRemove: (id: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

  const stale = row.state === "on-the-way" && daysSince(row.orderedAt) >= STALE_IN_TRANSIT_DAYS;

  return (
    <li className="border border-midnight/rule bg-cream p-3">
      <p className="truncate text-caption font-semibold text-midnight" title={row.itemName}>
        {row.itemName}
      </p>

      <dl className={`mt-2 ${CARD_FIELDS}`}>
        <Field label="Pack" value={packLabel(row)} />
        <Field label="Each" value={formatCents(row.packPriceCents)} numeric />
        <Field label="Total" value={formatCents(row.totalCents)} numeric />
        <Field label="Rate" value={rateLabel(row)} numeric />
        <Field
          label="From"
          value={row.supplierId ? (suppliers.get(row.supplierId) ?? null) : null}
        />
        <Field label="Ordered" value={formatDay(row.orderedAt)} numeric />
        <Field label="Arrived" value={formatDay(row.receivedAt)} numeric />
        <Field label="Lasted" value={durationLabel(row.duration)} numeric />
        <Field label="Notes" value={row.notes} />
      </dl>

      {/*
        Not an error, a question. Seven days on the way is usually a delivery
        that arrived and nobody said so, and left alone it turns into an
        approximate duration later. It is the one line allowed to appear on some
        cards and not others, because that is the whole point of it.
      */}
      {stale ? (
        <p className="mt-2 text-note font-semibold text-status-low">Did this arrive?</p>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-1 border-t border-midnight/rule pt-2">
        {row.state === "on-the-way" ? (
          <button type="button" onClick={() => onAct(row.id, "receive")} className={CARD_ACTION}>
            Arrived
          </button>
        ) : null}
        {row.state === "in-use" ? (
          <button type="button" onClick={() => onAct(row.id, "exhaust")} className={CARD_ACTION}>
            Used up
          </button>
        ) : null}
        {row.state === "exhausted" && !row.imported ? (
          <button type="button" onClick={() => onAct(row.id, "reopen")} className={CARD_ACTION}>
            Reopen
          </button>
        ) : null}
        {confirming ? (
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            aria-label={`Confirm deleting the ${row.itemName} order`}
            className="min-h-11 border border-emphasis border-status-out bg-status-out/veil px-2 text-xs font-semibold text-status-out md:h-8 md:min-h-0"
          >
            Delete?
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Delete the ${row.itemName} order`}
            className="min-h-11 w-8 border border-midnight/rule text-sm text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0"
          >
            <span aria-hidden>&minus;</span>
          </button>
        )}
      </div>
    </li>
  );
}

/**
 * What the store spent with nothing on the board to show for it.
 *
 * Five classes rather than one total, because they are not the same thing and
 * a single number misdirects: the produce the menu does not use is $91, while
 * the biggest line is a sealing machine, which is equipment. Ordered by size,
 * so whatever is actually largest reads first.
 */
function OffBoardSpend({ rows }: { rows: OffBoard[] }) {
  const [open, setOpen] = useState(false);
  if (rows.length === 0) return null;

  const total = rows.reduce((sum, row) => sum + row.cents, 0);

  return (
    <section className="mt-6 border-t border-midnight/rule-strong pt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 border border-midnight/rule px-4 text-caption font-semibold text-midnight transition-colors hover:bg-midnight/veil"
      >
        <span aria-hidden>{open ? "−" : "+"}</span>
        Spend with no board item ({formatCents(total)})
      </button>

      {open ? (
        <div className="pb-2">
          <p className="mt-3 max-w-prose text-note text-juniper">
            From the imported tracker history. Split by kind, because these are not one thing: a
            trial that becomes a menu item was worth buying, and equipment is an asset, not a loss.
          </p>
          <ul className="mt-3 md:columns-2 md:gap-6 xl:columns-3">
            {rows.map((row) => {
              const label = SPEND_CLASS_LABELS[row.spendClass as keyof typeof SPEND_CLASS_LABELS];
              if (!label) return null;
              return (
                <li
                  key={row.spendClass}
                  className="flex break-inside-avoid items-baseline justify-between gap-4 border-b border-midnight/rule py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-midnight md:text-caption">
                      {label.name}
                    </span>
                    <span className="block truncate text-note text-juniper" title={label.note}>
                      {label.note}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-semibold tabular-nums text-midnight md:text-caption">
                      {formatCents(row.cents)}
                    </span>
                    <span className="block text-note text-juniper">
                      {row.purchases} {row.purchases === 1 ? "purchase" : "purchases"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
