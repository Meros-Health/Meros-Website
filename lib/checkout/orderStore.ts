// Durable order claim + record on D1. Server-only: imported by the checkout
// action, never by client code (lib/checkout/idempotency.ts stays isomorphic).
//
// One INSERT is both the cross-isolate dedupe claim and the first write of
// the order record, so there is no window where an order exists without a
// claim or a claim without a row. The row is the store's own audit trail;
// it exists regardless of what Toast or Stripe later say about the order.
//
// Unlike logs (lib/log.ts), this record intentionally carries the customer's
// name, email and phone: it is the order the store fulfils, not telemetry.

import type { ClaimResult, OrderDedupe } from "@/lib/checkout/idempotency";

// Structural subset of Cloudflare's D1Database, so this module and its tests
// need no dependency on @cloudflare/workers-types.
export interface D1PreparedLike {
  bind(...values: unknown[]): D1PreparedLike;
  run(): Promise<{ meta: { changes: number } }>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

export interface D1Like {
  prepare(query: string): D1PreparedLike;
}

export type OrderRecordDetails = {
  name: string;
  email: string;
  phone: string;
  items: Array<{ name: string; quantity: number; unitPrice: number }>;
  total: number;
};

export class D1OrderStore implements OrderDedupe {
  constructor(private readonly db: D1Like) {}

  /**
   * Atomic cross-isolate claim. A thrown error (D1 unavailable) is deliberate:
   * the action's outer catch turns it into "try again", because accepting an
   * order without a dedupe guarantee is the failure mode the audit flagged.
   */
  async claim(key: string, orderRef: string): Promise<ClaimResult> {
    const inserted = await this.db
      .prepare(
        "INSERT INTO orders (idempotency_key, order_ref, created_at, status) VALUES (?1, ?2, ?3, 'claimed') ON CONFLICT (idempotency_key) DO NOTHING"
      )
      .bind(key, orderRef, new Date().toISOString())
      .run();
    if (inserted.meta.changes > 0) return { status: "new" };

    const existing = await this.db
      .prepare("SELECT order_ref FROM orders WHERE idempotency_key = ?1")
      .bind(key)
      .first<{ order_ref: string }>();
    // The conflicting row committed before our insert, so it is readable now.
    // A null here means the table itself is wrong; fail the submit.
    if (!existing) throw new Error("orders row missing after claim conflict");
    return { status: "duplicate", orderRef: existing.order_ref };
  }

  /** Fills in the claimed row. The order already exists; callers absorb errors. */
  async record(key: string, details: OrderRecordDetails): Promise<void> {
    await this.db
      .prepare(
        "UPDATE orders SET status = 'received', name = ?2, email = ?3, phone = ?4, line_count = ?5, total_cents = ?6, items = ?7 WHERE idempotency_key = ?1"
      )
      .bind(
        key,
        details.name,
        details.email,
        details.phone,
        details.items.length,
        Math.round(details.total * 100),
        JSON.stringify(details.items)
      )
      .run();
  }
}
