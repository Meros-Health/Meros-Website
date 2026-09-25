"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/ui/ScrollReveal";
import { AddItemModal, type AddItemSubmit } from "@/components/staff/AddItemModal";
import { lockLabel } from "@/lib/menu/dependencies";
import { builtInItemFor, resolveSection } from "@/lib/staff/customItems";
import {
  INGREDIENT_GROUPS,
  SUPPLY_GROUPS,
  type StaffItemDef,
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
//
// Three kinds of row share the board, and the "-" differs on each:
//
//   staff-added         deleted outright. Only D1 ever knew it.
//   built-in, free      hidden, and listed in "Not carrying" to restore from.
//   built-in, locked    a signature recipe, a Stack or the required base step
//                       needs it (lib/menu/dependencies.ts). The control is
//                       dead and says why in a tooltip.
//
// The server decides all three; these buttons are the affordance, not the rule.
//
// Hiding does not reach the customer site. /build is a static artifact, so a
// hidden ingredient stays orderable until it is pulled from menu.json and
// redeployed. The drawer says that out loud rather than implying otherwise.

const POLL_MS = 10_000;
// A "-" left in its confirming state is a stray tap, not an intention. Long
// enough to read "Remove?" and mean it, short enough that the row is back to
// normal before anyone else picks up the phone.
const CONFIRM_MS = 4_000;

type ItemState = { status: StaffStatus; updatedBy: string | null; updatedAt: string };
type Latest = { updatedBy: string | null; updatedAt: string } | null;
type CustomItem = { id: string; name: string; section: string };

/** A board row. `lock` set means something on the menu depends on it. */
type BoardItem = StaffItemDef & { custom?: boolean; lock?: string };
type BoardGroup = { name: string; items: BoardItem[] };

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

/**
 * What each group actually draws: its built-in rows minus anything the store
 * has stopped carrying, then that section's staff-added rows. Evenly spaced,
 * no gaps: a row that can appear and disappear at runtime has no answer for
 * which side of a visual break it belongs on, so the order carries the
 * grouping on its own. Added rows sort by name, which on a shelf checklist
 * scans better than the order people happened to add things in.
 *
 * The lock label is attached here, once per render, rather than looked up per
 * button: it is a pure function of menu.json and never changes at runtime.
 */
function buildGroups(
  groups: readonly { name: string; items: StaffItemDef[] }[],
  custom: CustomItem[],
  hidden: Set<string>
): BoardGroup[] {
  return groups.map((group) => {
    const built: BoardItem[] = group.items
      .filter((item) => !hidden.has(item.id))
      .map((item) => {
        const lock = lockLabel(item.id);
        return lock ? { ...item, lock } : item;
      });
    const added: BoardItem[] = custom
      .filter((item) => item.section === group.name)
      .sort((a, b) => a.name.localeCompare(b.name, "en-CA"))
      .map((item) => ({ id: item.id, name: item.name, custom: true }));
    return { name: group.name, items: [...built, ...added] };
  });
}

export function InventoryBoard() {
  const [statuses, setStatuses] = useState<Record<string, StaffStatus>>({});
  const [custom, setCustom] = useState<CustomItem[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [latest, setLatest] = useState<Latest>(null);
  const [tab, setTab] = useState<"ingredients" | "supplies">("ingredients");
  const [phase, setPhase] = useState<"loading" | "ready" | "unavailable">("loading");
  const [revealed, setRevealed] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  // Polls must not overwrite a tap that is still on its way to the server.
  const inflight = useRef(0);
  // The "+" that opened the dialog, so focus goes back where it came from.
  const addTrigger = useRef<HTMLElement | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/staff/items", { cache: "no-store" });
      if (res.status === 404) {
        setPhase("unavailable");
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as {
        items: Record<string, ItemState>;
        latest: Latest;
        custom: CustomItem[];
        hidden: string[];
      };
      if (inflight.current > 0) return;
      setStatuses(
        Object.fromEntries(Object.entries(data.items).map(([id, item]) => [id, item.status]))
      );
      setCustom(data.custom ?? []);
      setHidden(data.hidden ?? []);
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

  // Every write follows the same shape: hold off the poll, send, reconcile
  // with whatever actually landed once the last one is home.
  const settle = useCallback(() => {
    inflight.current -= 1;
    if (inflight.current === 0) void refresh();
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
        .then(settle);
    },
    [settle]
  );

  const addItem = useCallback<AddItemSubmit>(
    async (name, section) => {
      inflight.current += 1;
      try {
        const res = await fetch("/staff/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, section }),
        });
        if (res.status === 201) {
          const created = (await res.json()) as CustomItem;
          setCustom((prev) => [...prev, created]);
          return null;
        }
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        return body?.error ?? "Could not add that item. Try again.";
      } catch {
        return "Could not reach the board. Check the connection and try again.";
      } finally {
        settle();
      }
    },
    [settle]
  );

  const removeItem = useCallback(
    (id: string, isCustom: boolean) => {
      if (isCustom) {
        // Staff-added: gone for good, status row and all.
        setCustom((prev) => prev.filter((item) => item.id !== id));
        setStatuses((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        // Built-in: hidden, and its status is kept for when it comes back.
        setHidden((prev) => (prev.includes(id) ? prev : [...prev, id]));
      }
      inflight.current += 1;
      void fetch("/staff/items", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
        .catch(() => undefined)
        .then(settle);
    },
    [settle]
  );

  const restoreItem = useCallback(
    (id: string) => {
      setHidden((prev) => prev.filter((hiddenId) => hiddenId !== id));
      inflight.current += 1;
      void fetch("/staff/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", id }),
      })
        .catch(() => undefined)
        .then(settle);
    },
    [settle]
  );

  const openAdd = useCallback((section: string, trigger: HTMLElement | null) => {
    addTrigger.current = trigger;
    setAddingTo(section);
  }, []);

  const closeAdd = useCallback(() => {
    setAddingTo(null);
    addTrigger.current?.focus();
    addTrigger.current = null;
  }, []);

  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);

  // A row stores the section it was filed under, so a group renamed in the
  // catalog leaves it naming something that no longer exists. resolveSection
  // maps the renames; anything it cannot place is gathered into "Unfiled"
  // below rather than dropped, because a row that vanishes from the board is
  // still there in the table, still counting against the cap, and invisible.
  const filed = useMemo(
    () =>
      custom.map((item) => ({ ...item, section: resolveSection(item.section) ?? item.section })),
    [custom]
  );
  const ingredientGroups = useMemo(
    () => buildGroups(INGREDIENT_GROUPS, filed, hiddenSet),
    [filed, hiddenSet]
  );
  const supplyGroups = useMemo(() => {
    const groups = buildGroups(SUPPLY_GROUPS, filed, hiddenSet);
    const known = new Set([...INGREDIENT_GROUPS, ...SUPPLY_GROUPS].map((g) => g.name));
    const orphans = filed.filter((item) => !known.has(item.section));
    if (orphans.length === 0) return groups;
    return [
      ...groups,
      {
        name: "Unfiled",
        items: orphans.map((item) => ({ id: item.id, name: item.name, custom: true })),
      },
    ];
  }, [filed, hiddenSet]);

  const statusOf = (id: string): StaffStatus => statuses[id] ?? "in";
  const counts = (groups: BoardGroup[]) => {
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
  const total = counts([...ingredientGroups, ...supplyGroups]);

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
          groups={ingredientGroups}
          hiddenOnMobile={tab !== "ingredients"}
          statusOf={statusOf}
          setStatus={setStatus}
          onAdd={openAdd}
          onRemove={removeItem}
        />
        <BoardSection
          title="Supplies"
          groups={supplyGroups}
          hiddenOnMobile={tab !== "supplies"}
          statusOf={statusOf}
          setStatus={setStatus}
          onAdd={openAdd}
          onRemove={removeItem}
        />
        <NotCarrying hidden={hidden} onRestore={restoreItem} />
      </Reveal>

      <AddItemModal
        open={addingTo !== null}
        initialSection={addingTo ?? INGREDIENT_GROUPS[0].name}
        onClose={closeAdd}
        onSubmit={addItem}
      />
    </div>
  );
}

/**
 * What the store has stopped carrying, and the way back. Collapsed to a single
 * line until there is something in it.
 *
 * It states the customer-site caveat plainly. /build is a static artifact, so
 * hiding a row here does not stop the website offering it; pretending
 * otherwise would be the one genuinely dangerous thing this feature could do.
 */
function NotCarrying({ hidden, onRestore }: { hidden: string[]; onRestore: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  if (hidden.length === 0) return null;

  const rows = hidden
    .map((id) => ({ id, entry: builtInItemFor(id) }))
    .sort((a, b) => (a.entry?.name ?? a.id).localeCompare(b.entry?.name ?? b.id, "en-CA"));

  return (
    <section className="mt-10 border-t border-midnight/rule-strong pt-4">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 text-caption text-juniper transition-colors hover:text-midnight"
      >
        <span aria-hidden>{open ? "\u2212" : "+"}</span>
        Not carrying ({hidden.length})
      </button>

      {open ? (
        <div className="pb-2">
          <p className="max-w-prose text-note text-juniper">
            Off the board only. These are still on the ordering page until they come out of the menu
            itself, which needs a deploy.
          </p>
          <ul className="mt-3 md:columns-3 md:gap-6">
            {rows.map(({ id, entry }) => (
              <li
                key={id}
                className="flex break-inside-avoid items-center justify-between gap-3 py-1"
              >
                <span className="min-w-0 flex-1 text-sm md:text-caption">
                  {entry?.name ?? id}
                  {entry ? <span className="text-juniper"> · {entry.section}</span> : null}
                </span>
                <button
                  type="button"
                  onClick={() => onRestore(id)}
                  className="min-h-11 shrink-0 border border-midnight/rule px-3 text-xs tracking-body-mixed text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8 md:min-h-0"
                >
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function BoardSection({
  title,
  groups,
  hiddenOnMobile,
  statusOf,
  setStatus,
  onAdd,
  onRemove,
}: {
  title: string;
  groups: BoardGroup[];
  hiddenOnMobile: boolean;
  statusOf: (id: string) => StaffStatus;
  setStatus: (id: string, status: StaffStatus) => void;
  onAdd: (section: string, trigger: HTMLElement | null) => void;
  onRemove: (id: string, isCustom: boolean) => void;
}) {
  return (
    <section className={hiddenOnMobile ? "hidden md:block" : ""}>
      <h2 className="mt-10 hidden border-b border-midnight/rule-strong pb-2 font-headline text-lg md:block">
        {title}
      </h2>
      <div className="mt-2 md:mt-6 md:columns-3 md:gap-6">
        {groups.map((group) => (
          <GroupCard
            key={group.name}
            group={group}
            statusOf={statusOf}
            setStatus={setStatus}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
      </div>
    </section>
  );
}

function GroupCard({
  group,
  statusOf,
  setStatus,
  onAdd,
  onRemove,
}: {
  group: BoardGroup;
  statusOf: (id: string) => StaffStatus;
  setStatus: (id: string, status: StaffStatus) => void;
  onAdd: (section: string, trigger: HTMLElement | null) => void;
  onRemove: (id: string, isCustom: boolean) => void;
}) {
  // Which row's "-" is waiting on its second tap. One per card is enough:
  // confirming a second row cancels the first, which is the intent anyway.
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(null), CONFIRM_MS);
    return () => clearTimeout(timer);
  }, [confirming]);

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
          <li key={item.id} className="flex items-center justify-between gap-3 py-1">
            <span className="min-w-0 flex-1 text-sm md:text-caption">{item.name}</span>
            <span className="flex shrink-0 items-center gap-1">
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
              {item.lock ? (
                <button
                  type="button"
                  // aria-disabled rather than disabled: a truly disabled
                  // control is skipped by the accessibility tree and, in most
                  // browsers, shows no title on hover. This one carries no
                  // handler, so a click does nothing either way.
                  aria-disabled="true"
                  title={item.lock}
                  aria-label={`${item.name}: ${item.lock}, cannot be removed`}
                  className="h-11 w-8 cursor-not-allowed border border-midnight/rule text-sm text-midnight/25 md:h-8"
                >
                  <span aria-hidden>−</span>
                </button>
              ) : confirming === item.id ? (
                <button
                  type="button"
                  onClick={() => onRemove(item.id, item.custom === true)}
                  aria-label={`Confirm removing ${item.name}`}
                  className="h-11 border border-emphasis border-status-out bg-status-out/veil px-2 text-xs font-semibold text-status-out md:h-8"
                >
                  Remove?
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(item.id)}
                  aria-label={`Remove ${item.name}`}
                  className="h-11 w-8 border border-midnight/rule text-sm text-midnight/70 transition-colors hover:bg-midnight/veil md:h-8"
                >
                  <span aria-hidden>−</span>
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={(event) => onAdd(group.name, event.currentTarget)}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-caption text-juniper transition-colors hover:text-midnight md:min-h-8"
      >
        <span aria-hidden>+</span>
        Add to {group.name}
      </button>
    </div>
  );
}
