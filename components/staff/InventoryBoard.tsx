"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/ScrollReveal";
import {
  INGREDIENT_GROUPS,
  SUPPLY_GROUPS,
  type StaffGroupDef,
  type StaffStatus,
} from "@/lib/staff/catalog";

// The staff inventory board (/staff). Phones get two tabs and one column;
// desktop shows everything at once in three columns, because Saima's question
// is "what do I order", which wants the whole board in one glance.
//
// The board renders without the site's nav and footer (both hide themselves
// on /staff): this is a work surface staff open mid-shift, and the only way
// back out is the Back to site link it carries itself.
//
// A tap sends the status it means (`PATCH {id, status}`), never a toggle, so
// two people tapping the same row at the same moment agree on the result.
// State refreshes every 10 seconds and whenever the tab regains focus; at two
// or three concurrent users that is the right amount of realtime.
//
// Rows appear instantly, no stagger: 91 rows on the sitewide reveal cadence
// would take seconds to settle, and staff open this mid-shift to answer one
// question. Only the header gets the house entrance.

const POLL_MS = 10_000;

type ItemState = { status: StaffStatus; updatedBy: string | null; updatedAt: string };
type Latest = { updatedBy: string | null; updatedAt: string } | null;

const STATUS_LABELS: Record<StaffStatus, string> = { in: "In", low: "Low", out: "Out" };

// The board's only route out; the site chrome is hidden here. Padded to a
// 44px touch target since staff hit this on phones.
function BackToSite() {
  return (
    <Link
      href="/"
      className="inline-flex min-h-11 items-center gap-2 self-start text-caption text-juniper underline-offset-4 hover:underline"
    >
      <span aria-hidden>←</span>
      Back to site
    </Link>
  );
}

// Selected chip: the status colour as text + border + a faint wash of the
// same hue. Full class strings so Tailwind sees them.
const SELECTED: Record<StaffStatus, string> = {
  in: "border-emphasis border-status-in bg-status-in/veil text-status-in font-semibold",
  low: "border-emphasis border-status-low bg-status-low/veil text-status-low font-semibold",
  out: "border-emphasis border-status-out bg-status-out/veil text-status-out font-semibold",
};

const META_TONE = {
  clean: "text-juniper",
  low: "text-status-low",
  out: "text-status-out",
} as const;

function formatWhen(iso: string): string {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const sameDay = then.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat("en-CA", {
    ...(sameDay ? {} : { month: "short", day: "numeric" }),
    hour: "numeric",
    minute: "2-digit",
  }).format(then);
}

export function InventoryBoard() {
  const [statuses, setStatuses] = useState<Record<string, StaffStatus>>({});
  const [latest, setLatest] = useState<Latest>(null);
  const [tab, setTab] = useState<"ingredients" | "supplies">("ingredients");
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable">("loading");
  const [revealed, setRevealed] = useState(false);
  // Polls must not overwrite a tap that is still on its way to the server.
  const inflight = useRef(0);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/staff/items", { cache: "no-store" });
      if (res.status === 404) {
        setPhase("unavailable");
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { items: Record<string, ItemState>; latest: Latest };
      if (inflight.current > 0) return;
      setStatuses(Object.fromEntries(Object.entries(data.items).map(([id, item]) => [id, item.status])));
      setLatest(data.latest);
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

  const setStatus = useCallback(
    (id: string, status: StaffStatus) => {
      setStatuses((prev) => ({ ...prev, [id]: status }));
      setLatest({ updatedBy: null, updatedAt: new Date().toISOString() });
      inflight.current += 1;
      void fetch("/staff/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      })
        .catch(() => undefined)
        .then(() => {
          inflight.current -= 1;
          // Reconcile with whatever actually landed, ours or someone else's.
          if (inflight.current === 0) void refresh();
        });
    },
    [refresh]
  );

  const statusOf = (id: string): StaffStatus => statuses[id] ?? "in";
  const counts = (groups: StaffGroupDef[]) => {
    let low = 0;
    let out = 0;
    for (const group of groups) {
      for (const item of group.items) {
        const s = statusOf(item.id);
        if (s === "low") low += 1;
        if (s === "out") out += 1;
      }
    }
    return { low, out };
  };
  const total = counts([...INGREDIENT_GROUPS, ...SUPPLY_GROUPS]);

  if (phase === "unavailable") {
    return (
      <div className="px-section-x pb-24 pt-10">
        <BackToSite />
        <h1 className="mt-6 font-headline text-3xl">Inventory</h1>
        <p className="mt-4 max-w-md text-caption text-midnight/70">
          The inventory board is not switched on in this environment.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10 md:px-8 md:pt-12">
      <Reveal show={revealed} index={0}>
        <header className="flex flex-col gap-1.5">
          <BackToSite />
          <div className="mt-6 flex items-baseline justify-between gap-4">
            <h1 className="font-headline text-3xl">Inventory</h1>
            <p className="flex gap-3 text-xs">
              <span className="font-semibold text-status-low">{total.low} low</span>
              <span className="font-semibold text-status-out">{total.out} out</span>
            </p>
          </div>
          <p className="text-note text-juniper">
            {latest
              ? `Updated ${formatWhen(latest.updatedAt)}${latest.updatedBy ? ` · ${latest.updatedBy.split("@")[0]}` : ""}`
              : phase === "loading"
                ? "Loading…"
                : "No changes recorded yet"}
          </p>
        </header>
      </Reveal>

      <Reveal show={revealed} index={1}>
        {/* Phones split the board in two; the tabs disappear at md. */}
        <div className="mt-6 flex border-b border-midnight/rule md:hidden">
          {(["ingredients", "supplies"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              aria-pressed={tab === key}
              className={`h-12 flex-1 border-b-2 text-caption tracking-body-mixed transition-colors ${
                tab === key
                  ? "border-midnight font-semibold text-midnight"
                  : "border-transparent text-midnight/70"
              }`}
            >
              {key === "ingredients" ? "Ingredients" : "Supplies"}
            </button>
          ))}
        </div>

        <BoardSection
          title="Ingredients"
          groups={INGREDIENT_GROUPS}
          hiddenOnMobile={tab !== "ingredients"}
          statusOf={statusOf}
          setStatus={setStatus}
        />
        <BoardSection
          title="Supplies"
          groups={SUPPLY_GROUPS}
          hiddenOnMobile={tab !== "supplies"}
          statusOf={statusOf}
          setStatus={setStatus}
        />
      </Reveal>
    </div>
  );
}

function BoardSection({
  title,
  groups,
  hiddenOnMobile,
  statusOf,
  setStatus,
}: {
  title: string;
  groups: StaffGroupDef[];
  hiddenOnMobile: boolean;
  statusOf: (id: string) => StaffStatus;
  setStatus: (id: string, status: StaffStatus) => void;
}) {
  return (
    <section className={hiddenOnMobile ? "hidden md:block" : ""}>
      <h2 className="mt-10 hidden border-b border-midnight/rule-strong pb-2 font-headline text-lg md:block">
        {title}
      </h2>
      <div className="mt-2 md:mt-6 md:columns-3 md:gap-6">
        {groups.map((group) => (
          <GroupCard key={group.name} group={group} statusOf={statusOf} setStatus={setStatus} />
        ))}
      </div>
    </section>
  );
}

function GroupCard({
  group,
  statusOf,
  setStatus,
}: {
  group: StaffGroupDef;
  statusOf: (id: string) => StaffStatus;
  setStatus: (id: string, status: StaffStatus) => void;
}) {
  let low = 0;
  let out = 0;
  for (const item of group.items) {
    const s = statusOf(item.id);
    if (s === "low") low += 1;
    if (s === "out") out += 1;
  }
  const parts = [out > 0 ? `${out} out` : null, low > 0 ? `${low} low` : null].filter(Boolean);
  const tone = out > 0 ? META_TONE.out : low > 0 ? META_TONE.low : META_TONE.clean;

  return (
    <div className="break-inside-avoid pt-6 md:mb-6 md:border md:border-midnight/rule md:p-5 md:pt-4">
      <div className="flex items-baseline justify-between gap-3 border-b border-midnight/rule-strong pb-2">
        <h3 className="font-headline text-lg md:text-body">{group.name}</h3>
        <p className={`text-note ${tone}`}>{parts.length ? parts.join(" · ") : "all stocked"}</p>
      </div>
      <ul className="pt-2">
        {group.items.map((item) => (
          <li
            key={item.id}
            className={`flex items-center justify-between gap-3 py-1 ${item.gapAbove ? "mt-3" : ""}`}
          >
            <span className="min-w-0 flex-1 text-sm md:text-caption">{item.name}</span>
            <span className="flex shrink-0 gap-1">
              {(["in", "low", "out"] as const).map((status) => {
                const selected = statusOf(item.id) === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatus(item.id, status)}
                    aria-pressed={selected}
                    aria-label={`${item.name}: ${STATUS_LABELS[status]}`}
                    className={`h-11 w-[52px] border text-xs tracking-body-mixed transition-colors active:translate-y-px md:h-8 md:w-12 ${
                      selected
                        ? SELECTED[status]
                        : "border-midnight/rule text-midnight/70 hover:bg-midnight/veil"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
