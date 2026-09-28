-- What the store ordered, from whom, at what price, and how long it lasted
-- (/staff/ordering).
--
-- 0003 to 0005 cover what is on the shelf right now. This is the other
-- question, the one Saima actually asked: when did we last order this, how
-- much was it, and how long did it last. The board already knows the moment an
-- item runs out, so the only thing missing was the purchase at the other end.
--
-- The names in here are not ours. This system is temporary: it is replaced by
-- Trellum's inventory module, whose schema already exists
-- (apps/gaia-db/migrations/007_supply.sql in the Trellum repo). Every column
-- below that has an equivalent there carries that name exactly (ordered_at,
-- received_at, pack_size_g, notes, actor), so the migration is a copy rather
-- than a translation someone has to get right under time pressure. The two
-- Meros-only columns are called out where they appear.
--
-- Money is integer cents, never a float: 0.1 + 0.2 is not 0.3 and a price
-- someone reads off a receipt should survive a round trip unchanged.
--
-- NULL is not zero, anywhere in here. Trellum states this as a rule and it is
-- the right one: a null pack_price is a price nobody has told us yet, and a
-- zero would quietly become the cheapest supplier on record.

-- Who the store buys from. Seeded below from the tracker Saima keeps by hand.
--
-- `kind` matches Trellum's supplier_kind enum. It is one selection the first
-- time a supplier is added and it saves someone classifying eleven suppliers
-- from memory on migration day.
--
-- Removal is an archive, never a DELETE. Purchases point at these rows, and a
-- deleted supplier would leave last winter's prices attributed to nobody. Same
-- reasoning as staff_hidden_items: the row stops being offered, it does not
-- stop existing.
CREATE TABLE staff_suppliers (
  id          TEXT PRIMARY KEY,  -- slug, derived server-side from the name
  name        TEXT NOT NULL,
  kind        TEXT CHECK (kind IN ('wholesale', 'club', 'retail', 'local', 'marketplace')),
  archived_at TEXT,              -- set = off the selector; Trellum status 'retired'
  created_by  TEXT,              -- Cloudflare Access email; null in development
  created_at  TEXT NOT NULL
);

-- One purchase. A receipt, not a live price lookup: pack_price_cents is what
-- was paid that day and never changes afterwards, so a supplier raising a
-- price cannot rewrite what the store spent last month.
--
-- Three nullable timestamps carry the whole lifecycle, and there is
-- deliberately no status column beside them:
--
--   received_at NULL,  exhausted_at NULL   on the way
--   received_at set,   exhausted_at NULL   in use
--                      exhausted_at set    exhausted, shown in the archive
--
-- A status column would be a second place the same fact lives, free to drift
-- until a row claims to be in use with no delivery date. Dates cannot
-- contradict themselves.
--
-- item_name is a snapshot. A staff-added item is really deleted when it is
-- removed (see 0004), which would otherwise leave its order history pointing
-- at nothing. Supplier needs no snapshot because suppliers only ever archive.
--
-- Pack size is optional and is what makes suppliers comparable: $18.99 a pack
-- against $80 a case says nothing until both are per kilo, which is arithmetic
-- Saima is currently doing by hand in a Notes column. When it is missing the
-- row is still a good record of what was bought, just not one that can be
-- normalised.
--
-- It splits into two columns because a pack is measured one way or the other,
-- never both: pack_size_g for mass, pack_size_count for things bought by the
-- piece (a 6-count bag of kiwi, a case of 3000 napkins, where cost per napkin
-- is the number that matters). At most one is ever set. Volume is deliberately
-- not offered: converting litres to grams needs a density per ingredient, and
-- guessing water would quietly misprice honey and oil.
--
-- exhausted_at and duration_basis are the only columns with no Trellum home.
-- Trellum derives consumption from its stock_count ledger instead, so these
-- two are dropped on migration rather than mapped.
CREATE TABLE staff_purchases (
  id               TEXT PRIMARY KEY,
  item_id          TEXT NOT NULL,   -- a board item id (lib/staff/catalog.ts) or a custom: row
  item_name        TEXT NOT NULL,   -- snapshot, so history survives a deleted custom item
  supplier_id      TEXT REFERENCES staff_suppliers (id),
  quantity         REAL NOT NULL,   -- how many packs, as entered
  unit             TEXT NOT NULL,   -- Case, Bag, Pack, kg, ... (lib/staff/purchases.ts)
  pack_size_g      REAL,            -- one pack in grams; NULL when unknown, never 0
  pack_size_count  REAL,            -- or one pack in pieces; at most one of the two
  pack_price_cents INTEGER,         -- price of one pack; NULL when unknown, never 0
  ordered_at       TEXT NOT NULL,
  received_at      TEXT,
  exhausted_at     TEXT,            -- Meros-only: no Trellum equivalent
  duration_basis   TEXT CHECK (duration_basis IN ('received', 'ordered')),  -- Meros-only
  notes            TEXT,
  actor            TEXT NOT NULL DEFAULT 'user',  -- Trellum domain_actor: 'user' | 'agent'
  created_by       TEXT,            -- Cloudflare Access email; null in development
  created_at       TEXT NOT NULL,
  -- Mirrors Trellum's purchase_event_received_not_before_ordered, so no row
  -- written here can be one that fails to load there.
  CHECK (received_at IS NULL OR received_at >= ordered_at),
  -- A pack is measured by mass or by the piece, not by both at once.
  CHECK (pack_size_g IS NULL OR pack_size_count IS NULL)
);

-- The two reads the page makes: every purchase for one item (the per-item
-- history and the form's prefill), and everything still open (the current
-- table, and the rows to close when an item is marked out).
CREATE INDEX idx_staff_purchases_item ON staff_purchases (item_id);
CREATE INDEX idx_staff_purchases_open ON staff_purchases (exhausted_at);

-- The suppliers already in use, from the tracker. Seeded rather than typed so
-- that "Costco" and "costco " cannot become two suppliers on day one, which is
-- the failure that makes a year of price history ungroupable.
INSERT INTO staff_suppliers (id, name, kind, created_at) VALUES
  ('costco',                       'Costco',                       'club',        '2026-09-27T00:00:00.000Z'),
  ('gordon-food-service',          'Gordon Food Service',          'wholesale',   '2026-09-27T00:00:00.000Z'),
  ('freshpoint-foodservice',       'FreshPoint Foodservice',       'wholesale',   '2026-09-27T00:00:00.000Z'),
  ('tree-island-yogurt',           'Tree Island Yogurt',           'wholesale',   '2026-09-27T00:00:00.000Z'),
  ('berrymobile-fruit',            'Berrymobile Fruit',            'wholesale',   '2026-09-27T00:00:00.000Z'),
  ('yoggu-foods',                  'Yoggu Foods',                  'wholesale',   '2026-09-27T00:00:00.000Z'),
  ('tapio',                        'Tapio',                        'wholesale',   '2026-09-27T00:00:00.000Z'),
  ('amazon',                       'Amazon',                       'marketplace', '2026-09-27T00:00:00.000Z'),
  ('organic-matters',              'Organic Matters',              'local',       '2026-09-27T00:00:00.000Z'),
  ('honeybee-centre',              'Honeybee Centre',              'local',       '2026-09-27T00:00:00.000Z'),
  ('local-produce-supplier',       'Local / Produce Supplier',     'local',       '2026-09-27T00:00:00.000Z');
