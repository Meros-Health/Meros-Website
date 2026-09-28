"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/ScrollReveal";
import { LogOrderModal, type LogOrderSubmit } from "@/components/staff/LogOrderModal";
import { SupplierManager, type Supplier } from "@/components/staff/SupplierManager";
import {
  MS_PER_DAY,
  PACK_MEASURES,
  STALE_IN_TRANSIT_DAYS,
  formatCents,
  type SupplierKind,
} from "@/lib/staff/purchases";

// The ordering log (/staff/ordering): what is on order now, and what every
// past order cost and how long it lasted.
//
// It is its own page rather than a tab on the board. The board's tabs are
// md:hidden, phones only, because desktop shows both of its sections at once;
// a third tab there would simply vanish above 768px.
//
// Rows, not a table. Nothing else in this codebase is a <table>, and a table
// of eight columns on a phone held in one hand behind a counter is a
// horizontal scroll nobody does twice. Each order is one row with its numbers
// underneath, the same shape as the board.
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
  state: "on-the-way" | "in-use" | "exhausted";
  duration: Duration;
  totalCents: number | null;
  costPerKgCents: number | null;
  costPerCountCents: number | null;
};

type LastOrder = {
  supplierId: string | null;
  unit: string;
  packSizeG: number | null;
  packSizeCount: number | null;
  packPriceCents: number | null;
  orderedAt: string;
  costPerKgCents: number | null;
};

function formatDay(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric" }).format(then);
}

function daysSince(iso: string): number {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return 0;
  return Math.floor((Date.now() - then) / MS_PER_DAY);
}

/** "3 × 1 kg Bag", or "3 × Bag" when nobody recorded what a bag holds. */
function quantityLabel(row: Pick<Purchase, "quantity" | "unit" | "packSizeG" | "packSizeCount">) {
  const size = row.packSizeG
    ? row.packSizeG >= 1000
      ? `${+(row.packSizeG / 1000).toFixed(3)} ${PACK_MEASURES.kg.label}`
      : `${+row.packSizeG.toFixed(1)} ${PACK_MEASURES.g.label}`
    : row.packSizeCount
      ? `${+row.packSizeCount.toFixed(0)} ct`
      : null;
  return `${+row.quantity.toFixed(2)} × ${size ? `${size} ` : ""}${row.unit}`;
}

/** The money line: what a pack cost, what the order cost, and the per-kilo rate. */
function priceLabel(row: Purchase, suppliers: Map<string, string>): string {
  const parts: string[] = [];
  const pack = formatCents(row.packPriceCents);
  if (pack) parts.push(`${pack} each`);
  const total = formatCents(row.totalCents);
  if (total && row.quantity !== 1) parts.push(`${total} total`);
  const perKg = formatCents(row.costPerKgCents);
  if (perKg) parts.push(`${perKg}/kg`);
  const perCount = formatCents(row.costPerCountCents);
  if (perCount) parts.push(`${perCount} a piece`);
  const supplier = row.supplierId ? suppliers.get(row.supplierId) : null;
  if (supplier) parts.push(supplier);
  return parts.join(" · ");
}

export function OrderLog() {
  const [current, setCurrent] = useState<Purchase[]>([]);
  const [archive, setArchive] = useState<Purchase[]>([]);
  const [lastByItem, setLastByItem] = useState<Record<string, LastOrder>>({});
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
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
      };
      if (inflight.current > 0) return;
      setCurrent(data.current ?? []);
      setArchive(data.archive ?? []);
      setLastByItem(data.lastByItem ?? {});
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

  const onTheWay = current.filter((row) => row.state === "on-the-way");
  const inUse = current.filter((row) => row.state === "in-use");

  if (phase === "unavailable") {
    return (
      <div className="px-section-x pb-24 pt-10">
        <BackToBoard />
        <h1 className="mt-6 font-headline text-3xl">Ordering</h1>
        <p className="mt-4 max-w-md text-caption text-midnight/70">
          The ordering log is not switched on in this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-5 pb-24 pt-10 md:px-8 md:pt-12">
      <Reveal show={revealed} index={0}>
        <header className="flex flex-col gap-1.5">
          <BackToBoard />
          <div className="mt-6 flex flex-wrap items-baseline justify-between gap-4">
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
              : `${current.length} on the books · ${archive.length} finished`}
          </p>
        </header>
      </Reveal>

      <Reveal show={revealed} index={1}>
        <Section title="Current">
          {current.length === 0 ? (
            <Empty>Nothing on order. Log one as it is placed and this fills itself in.</Empty>
          ) : (
            <ul>
              {[...onTheWay, ...inUse].map((row) => (
                <OrderRow
                  key={row.id}
                  row={row}
                  suppliers={supplierNames}
                  onAct={act}
                  onRemove={removeOrder}
                />
              ))}
            </ul>
          )}
        </Section>

        <Section title="Archive">
          {archive.length === 0 ? (
            <Empty>
              An order lands here when the board says its item ran out, with how long it lasted.
            </Empty>
          ) : (
            <ul>
              {archive.map((row) => (
                <OrderRow
                  key={row.id}
                  row={row}
                  suppliers={supplierNames}
                  onAct={act}
                  onRemove={removeOrder}
                />
              ))}
            </ul>
          )}
        </Section>

        <SupplierManager suppliers={suppliers} onAdd={addSupplier} onRemove={removeSupplier} />
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

function BackToBoard() {
  return (
    <Link
      href="/staff"
      className="inline-flex min-h-11 items-center gap-2 self-start text-caption text-juniper underline-offset-4 hover:underline"
    >
      <span aria-hidden>←</span>
      Back to inventory
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mt-10 border-b border-midnight/rule-strong pb-2 font-headline text-lg">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="max-w-prose py-3 text-note text-juniper">{children}</p>;
}

/**
 * One order. The item and the quantity read first, the money and the dates
 * sit underneath in a quieter tone, and the one control that matters for this
 * row's state sits on the right.
 */
function OrderRow({
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

  const price = priceLabel(row, suppliers);
  const stale = row.state === "on-the-way" && daysSince(row.orderedAt) >= STALE_IN_TRANSIT_DAYS;

  let status: React.ReactNode;
  if (row.state === "on-the-way") {
    status = stale ? (
      // Not an error, a question. Seven days on the way is usually a delivery
      // that arrived and nobody said so, and left alone it turns into an
      // approximate duration later.
      <span className="text-status-low">Ordered {formatDay(row.orderedAt)} · did this arrive?</span>
    ) : (
      <>On the way · ordered {formatDay(row.orderedAt)}</>
    );
  } else if (row.state === "in-use") {
    status = <>In use · here since {formatDay(row.receivedAt ?? row.orderedAt)}</>;
  } else {
    const days = row.duration;
    status = days ? (
      <>
        Lasted {days.days} {days.days === 1 ? "day" : "days"}
        {days.approximate ? (
          <span className="text-juniper"> (approximate, no arrival recorded)</span>
        ) : null}
      </>
    ) : (
      <>Finished {formatDay(row.exhaustedAt ?? row.orderedAt)}</>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 border-b border-midnight/rule py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-midnight md:text-caption">
          <span className="font-semibold">{row.itemName}</span>
          <span className="text-midnight/70"> · {quantityLabel(row)}</span>
        </p>
        {price ? <p className="mt-0.5 text-note text-midnight/70">{price}</p> : null}
        <p className="mt-0.5 text-note text-juniper">{status}</p>
        {row.notes ? <p className="mt-0.5 text-note text-juniper">{row.notes}</p> : null}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {row.state === "on-the-way" ? (
          <button
            type="button"
            onClick={() => onAct(row.id, "receive")}
            className="min-h-11 border border-midnight/rule px-3 text-xs tracking-body-mixed text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0"
          >
            Arrived
          </button>
        ) : null}
        {row.state === "in-use" ? (
          <button
            type="button"
            onClick={() => onAct(row.id, "exhaust")}
            className="min-h-11 border border-midnight/rule px-3 text-xs tracking-body-mixed text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0"
          >
            Used up
          </button>
        ) : null}
        {row.state === "exhausted" ? (
          <button
            type="button"
            onClick={() => onAct(row.id, "reopen")}
            className="min-h-11 border border-midnight/rule px-3 text-xs tracking-body-mixed text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0"
          >
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
            <span aria-hidden>−</span>
          </button>
        )}
      </div>
    </li>
  );
}
