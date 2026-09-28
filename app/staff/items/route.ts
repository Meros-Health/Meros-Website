// State for the staff inventory board.
//
//   GET     the board's runtime state: every status row that has ever been set
//           (the client defaults everything else to 'in'), plus the items staff
//           added themselves.
//   PATCH   set one item to an explicit status.
//   POST    add an item to the board, or restore one that was removed.
//   DELETE  remove an item: delete it if staff added it, hide it if it is a
//           built-in row nothing on the menu depends on.
//
// PATCH takes the status, never "toggle": concurrent taps then converge on
// the tapped value instead of double-flipping. Ids and statuses are both
// allowlisted, so staff_items can only ever hold rows the board can render.
//
// Setting an item to Out also closes its open purchases (/staff/ordering).
// That coupling is the whole reason the ordering log can report how long a
// delivery lasted without anyone entering a second thing.
//
// What may be removed, and DELETE is where that is decided:
//
//   staff-added   a real DELETE FROM. Nothing customer-facing knows it exists.
//   built-in, no menu dependency   hidden: a staff_hidden_items row the board
//                 filters on. The catalog is compiled into the Worker, so this
//                 is the only thing "removed" can mean for it, and it is the
//                 same shape as staff_items overlaying status.
//   built-in, something depends on it   refused. A signature recipe, a Stack,
//                 or the required base step locks an ingredient
//                 (lib/menu/dependencies.ts, computed from menu.json). Out is
//                 the right answer for those: the store still owes it.
//
// The board draws a disabled "-" on locked rows, but the board is not the
// control. This handler is.
//
// Hiding does not reach the customer site: /build is a static artifact, so the
// ingredient stays orderable until it is pulled from menu.json and redeployed.
// The board's "Not carrying" drawer says so rather than letting them drift.
//
// POST takes a name, never an id: the id is slugified here. A client-chosen
// primary key would let a staff session write a row keyed `bananas` and shadow
// a registry ingredient on the board, or write an id the "custom:" check above
// cannot tell from a built-in.
//
// No per-IP throttle here, deliberately. lib/catering/rateLimit.ts keys on
// CF-Connecting-IP, which is right for an anonymous public form and wrong for
// this board: every staff phone on the store wifi is one address, so it would
// throttle the shift rather than an attacker. What bounds writes here is
// MAX_CUSTOM_ITEMS, the derived id, the section allowlist, and the fact that
// Access has already authenticated every caller.
//
// Identity and authentication: Cloudflare Access fronts /staff/* at the edge,
// and this handler re-verifies its signed JWT before answering (see
// lib/staff/access.ts). Reads are gated the same as writes: who is low on
// what is staff business. In development there is no Access, so there is no
// identity, and created_by / updated_by stay null.

import { NextResponse, type NextRequest } from "next/server";
import { lockLabel } from "@/lib/menu/dependencies";
import { isStaffItemId, isStaffStatus } from "@/lib/staff/catalog";
import {
  MAX_CUSTOM_ITEMS,
  builtInItemFor,
  checkStaffItemName,
  customStaffItemId,
  isCustomStaffItemId,
  isStaffSection,
} from "@/lib/staff/customItems";
import { NO_STORE, admitStaff, fail, readJson } from "@/lib/staff/admit";
import { inTransitCutoff } from "@/lib/staff/purchases";

// Live state: never prerender, never cache.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const [rows, customRows, hiddenRows] = await Promise.all([
    admitted.store.list(),
    admitted.store.listCustom(),
    admitted.store.listHidden(),
  ]);

  const items: Record<string, { status: string; updatedBy: string | null; updatedAt: string }> = {};
  let latest: { updatedBy: string | null; updatedAt: string } | null = null;
  for (const row of rows) {
    items[row.id] = { status: row.status, updatedBy: row.updated_by, updatedAt: row.updated_at };
    if (!latest || row.updated_at > latest.updatedAt) {
      latest = { updatedBy: row.updated_by, updatedAt: row.updated_at };
    }
  }

  const custom = customRows.map((row) => ({
    id: row.id,
    name: row.name,
    section: row.section,
    createdBy: row.created_by,
    createdAt: row.created_at,
  }));

  const hidden = hiddenRows.map((row) => row.id);
  return NextResponse.json({ items, latest, custom, hidden }, { headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  const { id, status } = body as { id?: unknown; status?: unknown };
  if (!isStaffStatus(status)) return fail("unknown status", 400);
  if (typeof id !== "string") return fail("unknown item", 400);

  // A built-in id is known from the bundle. A custom id is only real if it is
  // in the table: checking keeps staff_items free of statuses for rows the
  // board can no longer render.
  if (!isStaffItemId(id)) {
    if (!isCustomStaffItemId(id)) return fail("unknown item", 400);
    const custom = await admitted.store.listCustom();
    if (!custom.some((row) => row.id === id)) return fail("unknown item", 400);
  }

  await admitted.store.set(id, status, admitted.email);

  // Running out is the other end of an order, so it closes one. This is the
  // only place the ordering log learns how long a delivery lasted: nobody is
  // going to open a second screen to say "that bag is finished", but they do
  // tap Out, because that is the tap that stops the next customer being
  // promised something the store does not have.
  //
  // Which rows close, and why it is not simply "all of them", is documented on
  // exhaustOpenForItem in lib/staff/purchaseStore.ts.
  //
  // A failure here must not fail the tap. The status is the part the shift
  // depends on and it is already written; a missed close costs one duration
  // figure, and the row stays open to be closed by hand.
  if (status === "out") {
    try {
      await admitted.purchases.exhaustOpenForItem(id, new Date().toISOString(), inTransitCutoff());
    } catch {
      // Deliberately swallowed: see above.
    }
  }

  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  // Putting a hidden built-in back. Absent action means add, so a client from
  // before this shipped still works.
  if (body.action === "restore") {
    const { id } = body as { id?: unknown };
    if (typeof id !== "string" || !isStaffItemId(id)) return fail("unknown item", 400);
    await admitted.store.unhide(id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  const checked = checkStaffItemName(body.name);
  if (!checked.ok) return fail(checked.message, 400);
  if (!isStaffSection(body.section)) return fail("Choose a section.", 400);

  // A name that slugifies onto a built-in is not a duplicate row, it is
  // someone who could not find an item that is already there. Say where it is.
  const collision = builtInItemFor(checked.slug);
  if (collision) {
    return fail(`${collision.name} is already on the board, under ${collision.section}.`, 409);
  }

  const id = customStaffItemId(checked.slug);
  const existing = await admitted.store.listCustom();

  // Duplicate before cap: on a full board, re-adding something already there
  // should say where it is, not that the board is full.
  const twin = existing.find((item) => item.id === id);
  if (twin) return fail(`${twin.name} is already on the board, under ${twin.section}.`, 409);
  if (existing.length >= MAX_CUSTOM_ITEMS) {
    return fail(`The board is at its limit of ${MAX_CUSTOM_ITEMS} added items.`, 409);
  }

  const row = {
    id,
    name: checked.name,
    section: body.section,
    created_by: admitted.email,
    created_at: new Date().toISOString(),
  };
  // False means someone else inserted the same id first, between the read
  // above and this write.
  if (!(await admitted.store.addCustom(row))) {
    return fail(`${checked.name} is already on the board.`, 409);
  }

  return NextResponse.json(
    { id, name: row.name, section: row.section },
    { status: 201, headers: NO_STORE }
  );
}

export async function DELETE(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  const { id } = body as { id?: unknown };
  if (typeof id !== "string") return fail("unknown item", 400);

  // Staff-added: it only ever existed in D1, so it really goes, status and all.
  if (isCustomStaffItemId(id)) {
    await admitted.store.removeCustom(id);
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (!isStaffItemId(id)) return fail("unknown item", 400);

  // The guard. Supplies have no menu to depend on them, so they are never
  // locked; an ingredient is locked exactly when menu.json says something
  // needs it.
  const locked = lockLabel(id);
  if (locked) return fail(`${locked}. Set it Out instead.`, 409);

  await admitted.store.hide(id, admitted.email);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
