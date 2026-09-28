-- Where a purchase came from, and what kind of spend it was.
--
-- Two things 0006 did not anticipate.
--
-- The first is provenance. Most of what this table will ever hold was not
-- typed into the portal: it was imported from the ordering tracker Saima kept
-- by hand, 202 purchases back to February. An imported row is a good record of
-- what was paid and a bad record of anything else, because the tracker never
-- recorded when stock ran out. source_file marks them so the page can say so
-- rather than presenting an import as something a staff member logged. The
-- column name is Trellum's, which carries source_file on supplier, ingredient
-- and product for the same reason.
--
-- The second is the spend that has no board item at all. The tracker paid for
-- plums, kiwi and two bags of grapes the menu does not use, for five fruit
-- purees nobody has decided about, for whipping cream the store genuinely uses
-- but never put on the board, and for a $1,390 cup sealing machine. Dropping
-- those on import would answer "what did we order" while quietly losing "what
-- did we spend", and the second question is the one nobody can answer today.
--
-- They are not one kind of thing, and one "waste" flag over all of them would
-- report $2,678 of waste when the off-menu produce is $91. So the class is the
-- data, and the page adds it up per class:
--
--   stock      an ordinary purchase of a board item. Has an item_id.
--   off-menu   bought, not used by the menu. The grapes, the plums, the kiwi.
--   trial      bought deliberately to try: the purees, the avocado pulp.
--   untracked  genuinely used, never put on the board. A gap, not waste.
--   staff      not stock at all: the eggs, the cheese, the milk run.
--   capital    equipment. An asset, and the largest single line.
--
-- The CHECK ties the two halves together so the invariant cannot drift: a
-- stock purchase always names an item, and everything else never does.
--
-- Rebuilt rather than ALTERed because item_id was NOT NULL and SQLite cannot
-- drop that constraint in place. The INSERT..SELECT carries any existing rows
-- through, so this is safe whether the table is empty or not.

PRAGMA foreign_keys = OFF;

CREATE TABLE staff_purchases_new (
  id               TEXT PRIMARY KEY,
  item_id          TEXT,            -- NULL only for spend with no board item
  item_name        TEXT NOT NULL,   -- always set: it is the only name off-board spend has
  supplier_id      TEXT REFERENCES staff_suppliers (id),
  quantity         REAL NOT NULL,
  unit             TEXT NOT NULL,
  pack_size_g      REAL,
  pack_size_count  REAL,
  pack_price_cents INTEGER,
  ordered_at       TEXT NOT NULL,
  received_at      TEXT,
  exhausted_at     TEXT,
  duration_basis   TEXT CHECK (duration_basis IN ('received', 'ordered')),
  notes            TEXT,
  actor            TEXT NOT NULL DEFAULT 'user',
  spend_class      TEXT NOT NULL DEFAULT 'stock'
                     CHECK (spend_class IN ('stock', 'off-menu', 'trial', 'untracked', 'staff', 'capital')),
  source_file      TEXT,            -- set on an imported row, NULL when staff logged it
  created_by       TEXT,
  created_at       TEXT NOT NULL,
  CHECK (received_at IS NULL OR received_at >= ordered_at),
  CHECK (pack_size_g IS NULL OR pack_size_count IS NULL),
  -- Stock names an item; everything else is spend without one.
  CHECK ((item_id IS NOT NULL AND spend_class = 'stock')
      OR (item_id IS NULL AND spend_class <> 'stock'))
);

INSERT INTO staff_purchases_new (
  id, item_id, item_name, supplier_id, quantity, unit, pack_size_g, pack_size_count,
  pack_price_cents, ordered_at, received_at, exhausted_at, duration_basis, notes, actor,
  created_by, created_at
)
SELECT
  id, item_id, item_name, supplier_id, quantity, unit, pack_size_g, pack_size_count,
  pack_price_cents, ordered_at, received_at, exhausted_at, duration_basis, notes, actor,
  created_by, created_at
FROM staff_purchases;

DROP TABLE staff_purchases;
ALTER TABLE staff_purchases_new RENAME TO staff_purchases;

CREATE INDEX idx_staff_purchases_item ON staff_purchases (item_id);
CREATE INDEX idx_staff_purchases_open ON staff_purchases (exhausted_at);
-- The off-board summary reads this on its own.
CREATE INDEX idx_staff_purchases_class ON staff_purchases (spend_class);

PRAGMA foreign_keys = ON;
