// State for the staff inventory board.
//
//   GET     the board's runtime state: every status row that has ever been set
//           (the client defaults everything else to 'in'), plus the items staff
//           added themselves.
//   PATCH   set one item to an explicit status.
//   POST    add an item to the board.
//   DELETE  remove an item staff added.
//
// PATCH takes the status, never "toggle": concurrent taps then converge on
// the tapped value instead of double-flipping. Ids and statuses are both
// allowlisted, so staff_items can only ever hold rows the board can render.
//
// Built-in rows cannot be removed, and DELETE is where that is true. The
// board's 70 registry ingredients and its supplies list are compiled into the
// Worker (lib/staff/catalog.ts); only a "custom:" id, which by construction
// means a row in staff_custom_items, is deletable. The UI draws the "-" on
// those rows only, but the UI is not the control.
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
import { verifyStaffAccess } from "@/lib/staff/access";
import { isStaffItemId, isStaffStatus } from "@/lib/staff/catalog";
import {
  MAX_CUSTOM_ITEMS,
  builtInItemFor,
  checkStaffItemName,
  customStaffItemId,
  isCustomStaffItemId,
  isStaffSection,
} from "@/lib/staff/customItems";
import { getStaffRuntime, type StaffRuntime } from "@/lib/staff/runtime";

// Live state: never prerender, never cache.
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

type Denied = { response: NextResponse };
type Admitted = { store: NonNullable<StaffRuntime["store"]>; email: string | null };

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE });
}

async function admit(request: NextRequest): Promise<Admitted | Denied> {
  const { store, access } = getStaffRuntime();
  if (!store) return { response: fail("unavailable", 404) };
  if (!access) return { store, email: null }; // development only; production always carries config
  const identity = await verifyStaffAccess(request.headers.get("cf-access-jwt-assertion"), access);
  if (!identity) return { response: fail("forbidden", 403) };
  return { store, email: identity.email };
}

async function readJson(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    // A body that is not JSON is a client bug, not a condition to recover from.
    return null;
  }
}

export async function GET(request: NextRequest) {
  const admitted = await admit(request);
  if ("response" in admitted) return admitted.response;

  const [rows, customRows] = await Promise.all([
    admitted.store.list(),
    admitted.store.listCustom(),
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

  return NextResponse.json({ items, latest, custom }, { headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  const admitted = await admit(request);
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
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const admitted = await admit(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

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
  const admitted = await admit(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  // The one guard that keeps the built-in catalog unremovable.
  if (!isCustomStaffItemId(body.id)) return fail("This item cannot be removed.", 400);

  await admitted.store.removeCustom(body.id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
