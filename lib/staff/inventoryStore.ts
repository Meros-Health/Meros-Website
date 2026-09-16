// Durable status state for the staff inventory board on D1. Server-only:
// imported by the /staff/items route handler, never by client code.
//
// Reuses the site's single D1 database (the ORDERS_DB binding), same as the
// order record and the catering inquiries: a second binding for one table
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

// Structural subset of Cloudflare's D1Database, so this module and its tests
// need no dependency on @cloudflare/workers-types. lib/checkout/orderStore.ts
// has its own subset; this one needs all() where that one needs first().
export interface StaffD1PreparedLike {
  bind(...values: unknown[]): StaffD1PreparedLike;
  run(): Promise<unknown>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}

export interface StaffD1Like {
  prepare(query: string): StaffD1PreparedLike;
}

export interface StaffInventoryStore {
  list(): Promise<StaffStatusRow[]>;
  set(id: string, status: StaffStatus, updatedBy: string | null): Promise<void>;
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
}

// In-memory fallback for `next dev` without Worker bindings and for unit
// tests. Per-process and gone on restart, which is fine for the one job it
// has: letting the board be exercised where no D1 exists.
export class MemoryStaffInventoryStore implements StaffInventoryStore {
  private rows = new Map<string, StaffStatusRow>();

  async list(): Promise<StaffStatusRow[]> {
    return [...this.rows.values()];
  }

  async set(id: string, status: StaffStatus, updatedBy: string | null): Promise<void> {
    this.rows.set(id, { id, status, updated_by: updatedBy, updated_at: new Date().toISOString() });
  }
}
