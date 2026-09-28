// Durable purchase and supplier records on D1. Server-only: imported by the
// /staff/purchases and /staff/suppliers route handlers, never by client code.
//
// Reuses the ORDERS_DB binding, same as the order record, the catering
// inquiries and the inventory board. A second binding for two more tables
// would be a second thing to create, migrate and forget about.
//
// Two shapes of write, and the difference matters:
//
//   A purchase is append-then-annotate. The row is written once when the
//   order is placed and afterwards only ever gains timestamps (received,
//   exhausted). Nothing rewrites what was paid, because the row is the
//   receipt.
//
//   A supplier is never deleted. Purchases point at it, so removing one would
//   orphan every price it ever charged. Archiving takes it off the selector
//   and leaves the history intact.
//
// The one query with real logic in it is exhaustOpenForItem, below.

import type { StaffD1Like } from "@/lib/staff/inventoryStore";
import type { PurchaseRow, SupplierRow } from "@/lib/staff/purchases";

const PURCHASE_COLUMNS =
  "id, item_id, item_name, supplier_id, quantity, unit, pack_size_g, pack_size_count, " +
  "pack_price_cents, ordered_at, received_at, exhausted_at, duration_basis, notes, actor, " +
  "created_by, created_at";

const SUPPLIER_COLUMNS = "id, name, kind, archived_at, created_by, created_at";

/** What may be changed on a purchase after it is written. */
export type PurchasePatch = {
  received_at?: string | null;
  exhausted_at?: string | null;
  duration_basis?: "received" | "ordered" | null;
};

export interface StaffPurchaseStore {
  listSuppliers(): Promise<SupplierRow[]>;
  /** False when the id was already taken, which is how a concurrent duplicate add is caught. */
  addSupplier(row: SupplierRow): Promise<boolean>;
  archiveSupplier(id: string, at: string): Promise<void>;

  /** Everything not yet exhausted: the current table, oldest order first. */
  listOpen(): Promise<PurchaseRow[]>;
  /** Exhausted rows, most recently finished first. */
  listArchive(limit: number): Promise<PurchaseRow[]>;
  /** The most recent purchase of each item, for the form prefill and the board. */
  listLatestPerItem(): Promise<PurchaseRow[]>;
  /** One item's history, newest first, for the price comparison in the form. */
  listForItem(itemId: string, limit: number): Promise<PurchaseRow[]>;

  countAll(): Promise<number>;
  countOpenForItem(itemId: string): Promise<number>;
  getPurchase(id: string): Promise<PurchaseRow | null>;
  addPurchase(row: PurchaseRow): Promise<void>;
  updatePurchase(id: string, patch: PurchasePatch): Promise<void>;
  removePurchase(id: string): Promise<void>;

  /**
   * Close every open purchase of an item because the board says it ran out.
   * Returns how many rows closed.
   */
  exhaustOpenForItem(itemId: string, now: string, inTransitCutoff: string): Promise<number>;
}

export class D1StaffPurchaseStore implements StaffPurchaseStore {
  constructor(private readonly db: StaffD1Like) {}

  async listSuppliers(): Promise<SupplierRow[]> {
    const { results } = await this.db
      .prepare(`SELECT ${SUPPLIER_COLUMNS} FROM staff_suppliers ORDER BY name COLLATE NOCASE`)
      .all<SupplierRow>();
    return results;
  }

  async addSupplier(row: SupplierRow): Promise<boolean> {
    const result = await this.db
      .prepare(
        "INSERT INTO staff_suppliers (id, name, kind, archived_at, created_by, created_at) " +
          "VALUES (?1, ?2, ?3, NULL, ?4, ?5) ON CONFLICT (id) DO NOTHING"
      )
      .bind(row.id, row.name, row.kind, row.created_by, row.created_at)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  /**
   * Archive, not delete. A supplier with a year of prices behind it cannot be
   * removed without taking the prices with it.
   */
  async archiveSupplier(id: string, at: string): Promise<void> {
    await this.db
      .prepare("UPDATE staff_suppliers SET archived_at = ?2 WHERE id = ?1 AND archived_at IS NULL")
      .bind(id, at)
      .run();
  }

  async listOpen(): Promise<PurchaseRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${PURCHASE_COLUMNS} FROM staff_purchases WHERE exhausted_at IS NULL ORDER BY ordered_at ASC`
      )
      .all<PurchaseRow>();
    return results;
  }

  async listArchive(limit: number): Promise<PurchaseRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${PURCHASE_COLUMNS} FROM staff_purchases WHERE exhausted_at IS NOT NULL ` +
          "ORDER BY exhausted_at DESC LIMIT ?1"
      )
      .bind(limit)
      .all<PurchaseRow>();
    return results;
  }

  /**
   * One row per item, the newest. A window function rather than a read of the
   * whole table: the board asks this on every poll.
   */
  async listLatestPerItem(): Promise<PurchaseRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${PURCHASE_COLUMNS} FROM (` +
          `SELECT ${PURCHASE_COLUMNS}, ROW_NUMBER() OVER (` +
          "PARTITION BY item_id ORDER BY ordered_at DESC, created_at DESC" +
          ") AS rn FROM staff_purchases) WHERE rn = 1"
      )
      .all<PurchaseRow>();
    return results;
  }

  async listForItem(itemId: string, limit: number): Promise<PurchaseRow[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${PURCHASE_COLUMNS} FROM staff_purchases WHERE item_id = ?1 ` +
          "ORDER BY ordered_at DESC, created_at DESC LIMIT ?2"
      )
      .bind(itemId, limit)
      .all<PurchaseRow>();
    return results;
  }

  async countAll(): Promise<number> {
    const { results } = await this.db
      .prepare("SELECT COUNT(*) AS n FROM staff_purchases")
      .all<{ n: number }>();
    return results[0]?.n ?? 0;
  }

  async countOpenForItem(itemId: string): Promise<number> {
    const { results } = await this.db
      .prepare(
        "SELECT COUNT(*) AS n FROM staff_purchases WHERE item_id = ?1 AND exhausted_at IS NULL"
      )
      .bind(itemId)
      .all<{ n: number }>();
    return results[0]?.n ?? 0;
  }

  async getPurchase(id: string): Promise<PurchaseRow | null> {
    const { results } = await this.db
      .prepare(`SELECT ${PURCHASE_COLUMNS} FROM staff_purchases WHERE id = ?1`)
      .bind(id)
      .all<PurchaseRow>();
    return results[0] ?? null;
  }

  async addPurchase(row: PurchaseRow): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO staff_purchases (id, item_id, item_name, supplier_id, quantity, unit, " +
          "pack_size_g, pack_size_count, pack_price_cents, ordered_at, received_at, exhausted_at, " +
          "duration_basis, notes, actor, created_by, created_at) VALUES " +
          "(?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)"
      )
      .bind(
        row.id,
        row.item_id,
        row.item_name,
        row.supplier_id,
        row.quantity,
        row.unit,
        row.pack_size_g,
        row.pack_size_count,
        row.pack_price_cents,
        row.ordered_at,
        row.received_at,
        row.exhausted_at,
        row.duration_basis,
        row.notes,
        row.actor,
        row.created_by,
        row.created_at
      )
      .run();
  }

  /**
   * Only the lifecycle timestamps are patchable. The quantity, the price and
   * the supplier are what the receipt said; a row recorded wrongly is deleted
   * and entered again rather than edited into a different receipt.
   */
  async updatePurchase(id: string, patch: PurchasePatch): Promise<void> {
    const sets: string[] = [];
    const values: unknown[] = [];
    for (const key of ["received_at", "exhausted_at", "duration_basis"] as const) {
      if (key in patch) {
        values.push(patch[key] ?? null);
        sets.push(`${key} = ?${values.length + 1}`);
      }
    }
    if (sets.length === 0) return;
    await this.db
      .prepare(`UPDATE staff_purchases SET ${sets.join(", ")} WHERE id = ?1`)
      .bind(id, ...values)
      .run();
  }

  async removePurchase(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM staff_purchases WHERE id = ?1").bind(id).run();
  }

  /**
   * One statement, so the close is atomic without needing a transaction.
   *
   * Which rows it takes is the whole design of the feature:
   *
   *   Delivered rows close with an exact duration, measured from the day the
   *   stock actually landed.
   *
   *   Rows still marked on the way, but ordered before the cut-off, are
   *   deliveries nobody recorded. They close measured from the order date and
   *   are flagged 'ordered' so the page can say the number is approximate
   *   rather than presenting shipping lag as shelf life.
   *
   *   Rows ordered after the cut-off are left alone. An item is usually marked
   *   out exactly when the replacement has not arrived, and archiving that
   *   order would record a shelf life of zero for stock nobody has opened.
   */
  async exhaustOpenForItem(itemId: string, now: string, inTransitCutoff: string): Promise<number> {
    const result = await this.db
      .prepare(
        "UPDATE staff_purchases SET exhausted_at = ?2, duration_basis = " +
          "CASE WHEN received_at IS NOT NULL THEN 'received' ELSE 'ordered' END " +
          "WHERE item_id = ?1 AND exhausted_at IS NULL " +
          "AND (received_at IS NOT NULL OR ordered_at <= ?3)"
      )
      .bind(itemId, now, inTransitCutoff)
      .run();
    return result.meta?.changes ?? 0;
  }
}

/**
 * The same store in memory, for `next dev` without bindings and for the unit
 * tests. Held on globalThis by lib/staff/runtime.ts so state survives the dev
 * server re-evaluating modules on edit.
 */
export class MemoryStaffPurchaseStore implements StaffPurchaseStore {
  private suppliers = new Map<string, SupplierRow>();
  private purchases = new Map<string, PurchaseRow>();

  /** Lets a test start from the seeded suppliers the migration writes. */
  seedSuppliers(rows: SupplierRow[]): void {
    for (const row of rows) this.suppliers.set(row.id, { ...row });
  }

  reset(): void {
    this.suppliers.clear();
    this.purchases.clear();
  }

  async listSuppliers(): Promise<SupplierRow[]> {
    return [...this.suppliers.values()].sort((a, b) => a.name.localeCompare(b.name, "en-CA"));
  }

  async addSupplier(row: SupplierRow): Promise<boolean> {
    if (this.suppliers.has(row.id)) return false;
    this.suppliers.set(row.id, { ...row });
    return true;
  }

  async archiveSupplier(id: string, at: string): Promise<void> {
    const row = this.suppliers.get(id);
    if (row && !row.archived_at) this.suppliers.set(id, { ...row, archived_at: at });
  }

  async listOpen(): Promise<PurchaseRow[]> {
    return [...this.purchases.values()]
      .filter((row) => !row.exhausted_at)
      .sort((a, b) => a.ordered_at.localeCompare(b.ordered_at));
  }

  async listArchive(limit: number): Promise<PurchaseRow[]> {
    return [...this.purchases.values()]
      .filter((row) => row.exhausted_at)
      .sort((a, b) => (b.exhausted_at ?? "").localeCompare(a.exhausted_at ?? ""))
      .slice(0, limit);
  }

  async listLatestPerItem(): Promise<PurchaseRow[]> {
    const latest = new Map<string, PurchaseRow>();
    for (const row of this.purchases.values()) {
      const held = latest.get(row.item_id);
      const newer =
        !held ||
        row.ordered_at > held.ordered_at ||
        (row.ordered_at === held.ordered_at && row.created_at > held.created_at);
      if (newer) latest.set(row.item_id, row);
    }
    return [...latest.values()];
  }

  async listForItem(itemId: string, limit: number): Promise<PurchaseRow[]> {
    return [...this.purchases.values()]
      .filter((row) => row.item_id === itemId)
      .sort(
        (a, b) =>
          b.ordered_at.localeCompare(a.ordered_at) || b.created_at.localeCompare(a.created_at)
      )
      .slice(0, limit);
  }

  async countAll(): Promise<number> {
    return this.purchases.size;
  }

  async countOpenForItem(itemId: string): Promise<number> {
    return [...this.purchases.values()].filter((row) => row.item_id === itemId && !row.exhausted_at)
      .length;
  }

  async getPurchase(id: string): Promise<PurchaseRow | null> {
    const row = this.purchases.get(id);
    return row ? { ...row } : null;
  }

  async addPurchase(row: PurchaseRow): Promise<void> {
    this.purchases.set(row.id, { ...row });
  }

  async updatePurchase(id: string, patch: PurchasePatch): Promise<void> {
    const row = this.purchases.get(id);
    if (row) this.purchases.set(id, { ...row, ...patch });
  }

  async removePurchase(id: string): Promise<void> {
    this.purchases.delete(id);
  }

  async exhaustOpenForItem(itemId: string, now: string, inTransitCutoff: string): Promise<number> {
    let closed = 0;
    for (const [id, row] of this.purchases) {
      if (row.item_id !== itemId || row.exhausted_at) continue;
      if (!row.received_at && row.ordered_at > inTransitCutoff) continue;
      this.purchases.set(id, {
        ...row,
        exhausted_at: now,
        duration_basis: row.received_at ? "received" : "ordered",
      });
      closed += 1;
    }
    return closed;
  }
}
