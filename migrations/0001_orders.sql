-- The order record. One row per submit attempt, keyed by the client's
-- idempotency key: the INSERT is the atomic dedupe claim, the row is the
-- store's own audit trail (independent of Toast, per docs/online-ordering/PLAN.md).
--
-- Lifecycle of status:
--   'claimed'   key claimed, order not yet recorded (a crash between the two
--               leaves this; the customer got the generic retry message)
--   'received'  order accepted and recorded (today's terminal state)
--   later:      'paid', 'sent_to_pos', 'failed' when Stripe / Toast land
CREATE TABLE IF NOT EXISTS orders (
  idempotency_key TEXT PRIMARY KEY,
  order_ref       TEXT NOT NULL,
  created_at      TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'claimed',
  name            TEXT,
  email           TEXT,
  phone           TEXT,
  line_count      INTEGER,
  total_cents     INTEGER,
  items           TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_order_ref ON orders (order_ref);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at);
