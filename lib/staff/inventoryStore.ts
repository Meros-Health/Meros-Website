// Durable state for the staff inventory board on D1. Server-only: imported by
// the /staff/items route handler, never by client code.
//
// Two tables, two jobs:
//
//   staff_items         the status ('in' / 'low' / 'out') of one board row,
//                       built-in or staff-added. An id with no row reads 'in'.
//   staff_custom_items  the rows staff added themselves. The built-in rows are
//                       code (lib/staff/catalog.ts), so they are not in here.
//   staff_hidden_items  built-in rows the store stopped carrying. The catalog
//                       cannot change at runtime, so the board filters on these
//                       instead, the same way staff_items overlays status.
//
// Reuses the site's single D1 database (the ORDERS_DB binding), same as the
// order record and the catering inquiries: a second binding for two tables
// would be a second thing to create, migrate and forget about.
//
// Writes are explicit sets, never toggles: the client sends the status it
// wants, so two people tapping the same row at the same moment agree on the
// result instead of double-flipping it. Last write wins, which at two or
// three concurrent users is the correct amount of machinery.

import type { StaffStatus } from "@/lib/staff/catalog";

export type StaffStatusRow = {
  id: string;
  status: StaffStatus;
  updated_by: string | null;
  updated_at: string;
};

export type StaffHiddenItemRow = {
  id: string;
  hidden_by: string | null;
  hidden_at: string;
};

export type StaffCustomItemRow = {
  id: string;
  name: string;
  section: string;
  created_by: string | null;
  created_at: string;
};

// Structural subset of Cloudflare's D1Database, so this module and its tests
// need no dependency on @cloudflare/workers-types. lib/checkout/orderStore.ts
// has its own subset; this one needs all() where that one needs first(), and
// run()'s changes count to tell an insert from a no-op on conflict.
export interface StaffD1PreparedLike {
  bind(...values: unknown[]): StaffD1PreparedLike;
  run(): Promise<{ meta?: { changes?: number } }>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface StaffD1Like {
  prepare(query: string): StaffD1PreparedLike;
}

export interface StaffInventoryStore {
  list(): Promise<StaffStatusRow[]>;
  set(id: string, status: StaffStatus, updatedBy: string | null): Promise<void>;
  listCustom(): Promise<StaffCustomItemRow[]>;
  /** False when the id was already taken, which is how a concurrent duplicate add is caught. */
  addCustom(row: StaffCustomItemRow): Promise<boolean>;
  removeCustom(id: string): Promise<void>;
  listHidden(): Promise<StaffHiddenItemRow[]>;
  hide(id: string, hiddenBy: string | null): Promise<void>;
  unhide(id: string): Promise<void>;
}

export class D1StaffInventoryStore implements StaffInventoryStore {
  constructor(private readonly db: StaffD1Like) {}

  async list(): Promise<StaffStatusRow[]> {
    const { results } = await this.db
      .prepare("SELECT id, status, updated_by, updated_at FROM staff_items")
      .all<StaffStatusRow>();
    return results;
  }

  async set(id: string, status: StaffStatus, updatedBy: string | null): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO staff_items (id, status, updated_by, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (id) DO UPDATE SET status = ?2, updated_by = ?3, updated_at = ?4"
      )
      .bind(id, status, updatedBy, new Date().toISOString())
      .run();
  }

  async listCustom(): Promise<StaffCustomItemRow[]> {
    const { results } = await this.db
      .prepare(
        "SELECT id, name, section, created_by, created_at FROM staff_custom_items ORDER BY created_at"
      )
      .all<StaffCustomItemRow>();
    return results;
  }

  // DO NOTHING rather than a read-then-write: two servers adding the same
  // thing in the same second is the realistic collision, and the primary key
  // is the only check that actually holds across both requests.
  async addCustom(row: StaffCustomItemRow): Promise<boolean> {
    const result = await this.db
      .prepare(
        "INSERT INTO staff_custom_items (id, name, section, created_by, created_at) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (id) DO NOTHING"
      )
      .bind(row.id, row.name, row.section, row.created_by, row.created_at)
      .run();
    return (result.meta?.changes ?? 0) > 0;
  }

  // The item first, its status second. A crash between the two leaves an
  // orphan status row for an id no longer on the board, which nothing reads;
  // the other order would leave the row visible with its status silently
  // reset. Dropping the status is what makes a re-added item start at 'in'
  // instead of inheriting last month's 'out'.
  async removeCustom(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM staff_custom_items WHERE id = ?1").bind(id).run();
    await this.db.prepare("DELETE FROM staff_items WHERE id = ?1").bind(id).run();
  }

  async listHidden(): Promise<StaffHiddenItemRow[]> {
    const { results } = await this.db
      .prepare("SELECT id, hidden_by, hidden_at FROM staff_hidden_items")
      .all<StaffHiddenItemRow>();
    return results;
  }

  // Idempotent: hiding something already hidden is not an error, it is two
  // people reaching the same conclusion. The first one keeps the attribution.
  async hide(id: string, hiddenBy: string | null): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO staff_hidden_items (id, hidden_by, hidden_at) VALUES (?1, ?2, ?3) ON CONFLICT (id) DO NOTHING"
      )
      .bind(id, hiddenBy, new Date().toISOString())
      .run();
  }

  // The status row deliberately survives. The ingredient still exists and may
  // come back, so what it was last set to is worth keeping.
  async unhide(id: string): Promise<void> {
    await this.db.prepare("DELETE FROM staff_hidden_items WHERE id = ?1").bind(id).run();
  }
}

// In-memory fallback for `next dev` without Worker bindings and for unit
// tests. Per-process and gone on restart, which is fine for the one job it
// has: letting the board be exercised where no D1 exists.
export class MemoryStaffInventoryStore implements StaffInventoryStore {
  private rows = new Map<string, StaffStatusRow>();
  private custom = new Map<string, StaffCustomItemRow>();
  private hidden = new Map<string, StaffHiddenItemRow>();

  async list(): Promise<StaffStatusRow[]> {
    return [...this.rows.values()];
  }

  async set(id: string, status: StaffStatus, updatedBy: string | null): Promise<void> {
    this.rows.set(id, { id, status, updated_by: updatedBy, updated_at: new Date().toISOString() });
  }

  async listCustom(): Promise<StaffCustomItemRow[]> {
    return [...this.custom.values()];
  }

  async addCustom(row: StaffCustomItemRow): Promise<boolean> {
    if (this.custom.has(row.id)) return false;
    this.custom.set(row.id, row);
    return true;
  }

  async removeCustom(id: string): Promise<void> {
    this.custom.delete(id);
    this.rows.delete(id);
  }

  async listHidden(): Promise<StaffHiddenItemRow[]> {
    return [...this.hidden.values()];
  }

  async hide(id: string, hiddenBy: string | null): Promise<void> {
    if (this.hidden.has(id)) return;
    this.hidden.set(id, { id, hidden_by: hiddenBy, hidden_at: new Date().toISOString() });
  }

  async unhide(id: string): Promise<void> {
    this.hidden.delete(id);
  }
}
