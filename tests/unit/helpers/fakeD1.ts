// In-memory stand-in for the D1Like subset lib/checkout/orderStore.ts uses.
// Dispatches on the query text of the three statements the store issues.
import type { D1Like, D1PreparedLike } from "@/lib/checkout/orderStore";

export type FakeOrderRow = {
  idempotency_key: string;
  order_ref: string;
  created_at: string;
  status: string;
  name?: string;
  email?: string;
  phone?: string;
  line_count?: number;
  total_cents?: number;
  items?: string;
};

export class FakeD1 implements D1Like {
  readonly rows = new Map<string, FakeOrderRow>();
  failing = false;

  prepare(query: string): D1PreparedLike {
    let bound: unknown[] = [];
    const self = this;
    const stmt: D1PreparedLike = {
      bind(...values: unknown[]) {
        bound = values;
        return stmt;
      },
      async run() {
        if (self.failing) throw new Error("D1 unavailable");
        if (query.startsWith("INSERT INTO orders")) {
          const [key, orderRef, createdAt] = bound as [string, string, string];
          if (self.rows.has(key)) return { meta: { changes: 0 } };
          self.rows.set(key, { idempotency_key: key, order_ref: orderRef, created_at: createdAt, status: "claimed" });
          return { meta: { changes: 1 } };
        }
        if (query.startsWith("UPDATE orders")) {
          const [key, name, email, phone, lineCount, totalCents, items] = bound as [
            string, string, string, string, number, number, string,
          ];
          const row = self.rows.get(key);
          if (!row) return { meta: { changes: 0 } };
          Object.assign(row, { status: "received", name, email, phone, line_count: lineCount, total_cents: totalCents, items });
          return { meta: { changes: 1 } };
        }
        throw new Error(`FakeD1: unexpected run() for ${query}`);
      },
      async first<T>() {
        if (self.failing) throw new Error("D1 unavailable");
        if (query.startsWith("SELECT order_ref")) {
          const [key] = bound as [string];
          const row = self.rows.get(key);
          return (row ? { order_ref: row.order_ref } : null) as T | null;
        }
        throw new Error(`FakeD1: unexpected first() for ${query}`);
      },
    };
    return stmt;
  }
}
