// One submit attempt is one order. The client generates a key per attempt and
// the action claims it before creating the order; a second claim on the same
// key returns the first order's reference instead of creating another.
//
// The in-memory implementation is per isolate. It closes the reproduced
// cases (double click, double Enter, retry after a timeout within the same
// isolate) but is not a cross-isolate guarantee. A durable implementation
// (D1 or a Durable Object) is a prerequisite of the POS integration and is
// the only thing that changes when it lands.

export type ClaimResult = { status: "new" } | { status: "duplicate"; orderRef: string };

export interface OrderDedupe {
  /** Atomically records `orderRef` under `key`, or reports the ref already recorded. */
  claim(key: string, orderRef: string): Promise<ClaimResult>;
}

// Loose on purpose: this is a dedupe handle, not a credential. crypto.randomUUID
// is unavailable on plain-HTTP LAN access, so the fallback shape is accepted too.
const KEY_PATTERN = /^[A-Za-z0-9-]{16,64}$/;

export function isIdempotencyKey(value: unknown): value is string {
  return typeof value === "string" && KEY_PATTERN.test(value);
}

/** Isomorphic: runs in the browser to mint the key the action will dedupe on. */
export function makeIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 10_000;

export class MemoryOrderDedupe implements OrderDedupe {
  private readonly entries = new Map<string, { orderRef: string; expiresAt: number }>();

  constructor(
    private readonly ttlMs = DEFAULT_TTL_MS,
    private readonly maxEntries = DEFAULT_MAX_ENTRIES,
    private readonly now: () => number = () => Date.now()
  ) {}

  async claim(key: string, orderRef: string): Promise<ClaimResult> {
    const now = this.now();
    this.prune(now);
    const existing = this.entries.get(key);
    if (existing) return { status: "duplicate", orderRef: existing.orderRef };
    this.entries.set(key, { orderRef, expiresAt: now + this.ttlMs });
    return { status: "new" };
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(key);
    }
    // Insertion order is oldest first, so evicting from the front keeps the
    // most recent claims when the map is full.
    while (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

let instance: OrderDedupe | null = null;

export function getOrderDedupe(): OrderDedupe {
  instance ??= new MemoryOrderDedupe();
  return instance;
}

/** Tests only: start from an empty dedupe table. */
export function resetOrderDedupeForTests(): void {
  instance = null;
}
