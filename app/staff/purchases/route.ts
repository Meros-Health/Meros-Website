// The ordering log (/staff/ordering): what was ordered, from whom, at what
// price, and how long it lasted.
//
//   GET     the current table, the archive, and the most recent order of each
//           item. With ?item=<id>, that one item's history instead, which is
//           what the form uses to prefill and to show the last price paid.
//   POST    log an order.
//   PATCH   receive one, exhaust it by hand, or reopen it from the archive.
//   DELETE  remove a row entered by mistake.
//
// A purchase is a receipt. Only the lifecycle timestamps are patchable; the
// quantity, the price and the supplier are what the receipt said, so a row
// entered wrongly is deleted and entered again rather than edited into a
// different receipt. That is what makes a price history worth reading a year
// from now.
//
// Most rows are closed for staff, not by them: setting an item to Out on the
// board closes its open purchases (see PATCH in app/staff/items/route.ts).
// The exhaust action here is the manual path for the cases the board's tap
// cannot express, and reopen undoes an item marked Out too early.
//
// No per-IP throttle, for the same reason the board has none: every staff
// phone on the store wifi is one address, so an IP limit would throttle the
// shift rather than an attacker. What bounds writes here is Access having
// already authenticated the caller, the allowlisted item and unit, the
// server-derived id, and the two row caps in lib/staff/purchases.ts.

import { NextResponse, type NextRequest } from "next/server";
import { NO_STORE, admitStaff, fail, readJson, type Admitted } from "@/lib/staff/admit";
import { isStaffItemId } from "@/lib/staff/catalog";
import { builtInItemFor, isCustomStaffItemId } from "@/lib/staff/customItems";
import {
  MAX_OPEN_PURCHASES_PER_ITEM,
  MAX_PURCHASES,
  checkNote,
  checkOrderedAt,
  checkPackPriceCents,
  checkPackSize,
  checkQuantity,
  costPerCountCents,
  costPerKgCents,
  isPurchaseUnit,
  purchaseDuration,
  purchaseState,
  totalCents,
  type PurchaseRow,
} from "@/lib/staff/purchases";

export const dynamic = "force-dynamic";

/**
 * How much of the archive the page carries. Deep history is what the per-item
 * view is for; the archive table is something someone scrolls.
 */
const ARCHIVE_LIMIT = 200;
const ITEM_HISTORY_LIMIT = 50;

/**
 * The wire shape. Everything derived is computed here rather than in the
 * browser, so the page and any later digest email agree on what a duration is
 * without the rule living in two places.
 */
function serialize(row: PurchaseRow) {
  return {
    id: row.id,
    itemId: row.item_id,
    itemName: row.item_name,
    supplierId: row.supplier_id,
    quantity: row.quantity,
    unit: row.unit,
    packSizeG: row.pack_size_g,
    packSizeCount: row.pack_size_count,
    packPriceCents: row.pack_price_cents,
    orderedAt: row.ordered_at,
    receivedAt: row.received_at,
    exhaustedAt: row.exhausted_at,
    notes: row.notes,
    createdBy: row.created_by,
    state: purchaseState(row),
    spendClass: row.spend_class,
    imported: row.source_file !== null,
    duration: purchaseDuration(row),
    totalCents: totalCents(row),
    costPerKgCents: costPerKgCents(row),
    costPerCountCents: costPerCountCents(row),
  };
}

/**
 * The item a purchase may be logged against: a built-in board row, or a
 * staff-added one that is actually in the table. Returns the display name,
 * which is snapshotted onto the purchase because a staff-added item is really
 * deleted when removed and would otherwise take its order history with it.
 */
async function resolveItem(admitted: Admitted, id: unknown): Promise<string | null> {
  if (typeof id !== "string") return null;
  if (isStaffItemId(id)) return builtInItemFor(id)?.name ?? null;
  if (!isCustomStaffItemId(id)) return null;
  const custom = await admitted.store.listCustom();
  return custom.find((row) => row.id === id)?.name ?? null;
}

export async function GET(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  // One item's history, for the form's prefill and its price comparison.
  const itemId = request.nextUrl.searchParams.get("item");
  if (itemId) {
    const rows = await admitted.purchases.listForItem(itemId, ITEM_HISTORY_LIMIT);
    return NextResponse.json({ history: rows.map(serialize) }, { headers: NO_STORE });
  }

  const [open, archive, latest, suppliers, offBoard] = await Promise.all([
    admitted.purchases.listOpen(),
    admitted.purchases.listArchive(ARCHIVE_LIMIT),
    admitted.purchases.listLatestPerItem(),
    admitted.purchases.listSuppliers(),
    admitted.purchases.offBoardTotals(),
  ]);

  const lastByItem: Record<string, ReturnType<typeof serialize>> = {};
  for (const row of latest) if (row.item_id) lastByItem[row.item_id] = serialize(row);

  return NextResponse.json(
    {
      current: open.map(serialize),
      archive: archive.map(serialize),
      lastByItem,
      suppliers: suppliers
        .filter((row) => !row.archived_at)
        .map((row) => ({ id: row.id, name: row.name, kind: row.kind })),
      // What left the till with no board item behind it, by class.
      offBoard: offBoard.map((row) => ({
        spendClass: row.spend_class,
        purchases: row.purchases,
        cents: row.cents,
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

  const itemName = await resolveItem(admitted, body.itemId);
  if (itemName === null) return fail("Choose an item.", 400);

  if (!isPurchaseUnit(body.unit)) return fail("Choose a unit.", 400);

  const quantity = checkQuantity(body.quantity);
  if (!quantity.ok) return fail(quantity.message, 400);

  const price = checkPackPriceCents(body.packPriceCents);
  if (!price.ok) return fail(price.message, 400);

  const packSize = checkPackSize(body.packSize, body.packMeasure);
  if (!packSize.ok) return fail(packSize.message, 400);

  const orderedAt = checkOrderedAt(body.orderedAt);
  if (!orderedAt.ok) return fail(orderedAt.message, 400);

  const note = checkNote(body.notes);
  if (!note.ok) return fail(note.message, 400);

  // A supplier must be one on the list and not archived. Free text here is
  // what turns a year of prices into a list that cannot be grouped.
  let supplierId: string | null = null;
  if (body.supplierId !== undefined && body.supplierId !== null && body.supplierId !== "") {
    if (typeof body.supplierId !== "string") return fail("Choose a supplier.", 400);
    const suppliers = await admitted.purchases.listSuppliers();
    const supplier = suppliers.find((row) => row.id === body.supplierId);
    if (!supplier || supplier.archived_at) return fail("Choose a supplier.", 400);
    supplierId = supplier.id;
  }

  const [openForItem, total] = await Promise.all([
    admitted.purchases.countOpenForItem(body.itemId as string),
    admitted.purchases.countAll(),
  ]);
  if (openForItem >= MAX_OPEN_PURCHASES_PER_ITEM) {
    return fail(
      `${itemName} already has ${MAX_OPEN_PURCHASES_PER_ITEM} open orders. Close one first.`,
      409
    );
  }
  if (total >= MAX_PURCHASES) return fail("The ordering log is full.", 409);

  const now = new Date().toISOString();
  const row: PurchaseRow = {
    id: crypto.randomUUID(),
    item_id: body.itemId as string,
    item_name: itemName,
    supplier_id: supplierId,
    quantity: quantity.value,
    unit: body.unit,
    pack_size_g: packSize.value.grams,
    pack_size_count: packSize.value.count,
    pack_price_cents: price.value,
    ordered_at: orderedAt.value,
    // An order logged after it landed can say so up front; otherwise it starts
    // on the way and the Received button moves it.
    received_at: body.receivedNow === true ? now : null,
    exhausted_at: null,
    duration_basis: null,
    notes: note.value,
    actor: "user",
    // Everything logged through the form is ordinary stock: the form only
    // offers board items. Off-board spend arrives through the importer.
    spend_class: "stock",
    source_file: null,
    created_by: admitted.email,
    created_at: now,
  };

  // The database enforces this too, but rejecting it here gets a sentence
  // someone can act on instead of a 500.
  if (row.received_at && row.received_at < row.ordered_at) {
    return fail("An order cannot arrive before it was placed.", 400);
  }

  await admitted.purchases.addPurchase(row);
  return NextResponse.json(serialize(row), { status: 201, headers: NO_STORE });
}

export async function PATCH(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  const { id, action } = body as { id?: unknown; action?: unknown };
  if (typeof id !== "string") return fail("unknown order", 400);

  const row = await admitted.purchases.getPurchase(id);
  if (!row) return fail("unknown order", 400);

  const now = new Date().toISOString();

  if (action === "receive") {
    if (row.received_at) return fail("That order is already marked as arrived.", 409);
    // Backdating is not offered here: the button means "it is here now". An
    // order whose real delivery date matters and was missed is better deleted
    // and re-entered than silently given today's date as its arrival.
    if (now < row.ordered_at) return fail("An order cannot arrive before it was placed.", 400);
    await admitted.purchases.updatePurchase(id, { received_at: now });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  if (action === "exhaust") {
    if (row.exhausted_at) return fail("That order is already in the archive.", 409);
    await admitted.purchases.updatePurchase(id, {
      exhausted_at: now,
      duration_basis: row.received_at ? "received" : "ordered",
    });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  // Marked out too early, usually because the board was tapped while a
  // delivery was still in the van. Clearing the basis with the date keeps the
  // row from claiming a duration it no longer has.
  if (action === "reopen") {
    if (!row.exhausted_at) return fail("That order is already open.", 409);
    await admitted.purchases.updatePurchase(id, { exhausted_at: null, duration_basis: null });
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  }

  return fail("unknown action", 400);
}

export async function DELETE(request: NextRequest) {
  const admitted = await admitStaff(request);
  if ("response" in admitted) return admitted.response;

  const body = await readJson(request);
  if (!body) return fail("invalid JSON", 400);

  const { id } = body as { id?: unknown };
  if (typeof id !== "string") return fail("unknown order", 400);
  if (!(await admitted.purchases.getPurchase(id))) return fail("unknown order", 400);

  await admitted.purchases.removePurchase(id);
  return NextResponse.json({ ok: true }, { headers: NO_STORE });
}
