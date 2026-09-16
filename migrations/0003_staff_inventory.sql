-- Staff inventory board (/staff). One row per item that has ever been set;
-- an item with no row reads as 'in'. The catalog of what exists lives in
-- code (lib/staff/catalog.ts, built from lib/menu/menu.json), not here, so
-- the registry stays the single source of truth and a menu change never
-- needs a migration.
--
-- updated_by is the Cloudflare Access email of whoever set the status: the
-- audit line the board's header shows, not telemetry.
CREATE TABLE staff_items (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('in', 'low', 'out')),
  updated_by TEXT,
  updated_at TEXT NOT NULL
);
