// Who the store buys from (/staff/ordering).
//
//   GET     the live list, plus the archived ones so old orders still show a
//           name rather than an id.
//   POST    add a supplier.
//   DELETE  archive one. Never a real delete: purchases point at these rows,
//           and removing a supplier would leave every price it ever charged
//           attributed to nobody. Archiving takes it off the selector and
//           leaves the history readable, the same way staff_hidden_items
//           takes a board row off the board without erasing its status.
//
// POST takes a name, never an id, for the same reason the board's add does:
// the id is slugified here, so a client cannot choose a primary key and
// cannot write a row that shadows a seeded supplier. The slug doubles as the
// dedupe key, which is what stops "Costco" and "costco " becoming two
// suppliers on two different shifts and splitting a year of price history.
//
// The slug format is also Trellum's (^[a-z0-9]+(-[a-z0-9]+)*$, its idempotent
// join key), so these rows load into its supplier table without renaming.

import { NextResponse, type NextRequest } from "next/server";
import { NO_STORE, admitStaff, fail, readJson } from "@/lib/staff/admit";
import { checkStaffItemName } from "@/lib/staff/customItems";
import { isSupplierKind } from "@/lib/staff/purchases";

export const dynamic = "force-dynamic";

/** Far above the dozen real suppliers; bounds a stuck client, not a genuine add. */
const MAX_SUPPLIERS = 200;

export async function GET(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const rows = await admitted.purchases.listSuppliers();
  return NextResponse.json(
    {
      suppliers: rows.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
        archived: row.archived_at !== null,
      })),
    },
    { headers: NO_STORE }
  );
}

export async function POST(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  // Same validator the board uses for item names: the allowlist already
  // covers what turns up in real supplier names, punctuation included
  // ("Tree Island Yogurt / Canadian Cultured Dairy Inc.").
  const checked = checkStaffItemName(body.name);
  if (!checked.ok) return fail(checked.message, 400);
  if (body.kind !== undefined && body.kind !== null && !isSupplierKind(body.kind)) {
    return fail("Choose what kind of supplier this is.", 400);
  }

  const existing = await admitted.purchases.listSuppliers();

  // A name that slugifies onto one already there is someone who could not see
  // it, often because it is archived. Say which, rather than refusing blankly.
  const twin = existing.find((row) => row.id === checked.slug);
  if (twin) {
    return fail(
      twin.archived_at
        ? `${twin.name} is already there, archived. Restore it instead.`
        : `${twin.name} is already on the list.`,
      409
    );
  }
  if (existing.length >= MAX_SUPPLIERS) {
    return fail(`The supplier list is at its limit of ${MAX_SUPPLIERS}.`, 409);
  }

  const row = {
    id: checked.slug,
    name: checked.name,
    kind: isSupplierKind(body.kind) ? body.kind : null,
    archived_at: null,
    created_by: admitted.email,
    created_at: new Date().toISOString(),
  };
  // False means someone else inserted the same id between the read and here.
  if (!(await admitted.purchases.addSupplier(row))) {
    return fail(`${checked.name} is already on the list.`, 409);
  }

  return NextResponse.json(
    { id: row.id, name: row.name, kind: row.kind, archived: false },
    { status: 201, headers: NO_STORE }
  );
}

export async function DELETE(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  const { id } = body as { id?: unknown };
  if (typeof id !== "string") return fail("unknown supplier", 400);

  const existing = await admitted.purchases.listSuppliers();
  if (!existing.some((row) => row.id === id)) return fail("unknown supplier", 400);

  await admitted.purchases.archiveSupplier(id, new Date().toISOString());
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
