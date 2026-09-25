-- Built-in board rows the store has stopped carrying (/staff).
--
-- 0004 covers rows staff added, which are theirs to delete outright. This is
-- the other direction: a row that comes from the registry or the supplies list
-- in code, which staff want off the board because the store no longer carries
-- it. The catalog is compiled into the Worker, so "removed" here means a row
-- the board filters on, exactly the way staff_items overlays status without
-- editing the catalog either.
--
-- Only ingredients nothing on the menu depends on can land here. A signature
-- recipe, a Stack, or the required base step locks an ingredient, and the
-- DELETE handler refuses those (lib/menu/dependencies.ts computes which, from
-- menu.json, at build time). Supplies have no menu to depend on them, so they
-- are always eligible.
--
-- Hiding does NOT touch the customer site. /build is a static artifact, so an
-- ingredient hidden here is still orderable until it is pulled from menu.json
-- and redeployed. The board says so out loud in its "Not carrying" drawer
-- rather than letting the two drift quietly.
--
-- A hidden row keeps its staff_items status. The ingredient still exists and
-- may come back, so its last known status is worth keeping; a staff-added
-- item, by contrast, takes its status row with it when deleted.
CREATE TABLE staff_hidden_items (
  id        TEXT PRIMARY KEY,
  hidden_by TEXT,            -- Cloudflare Access email; null in development
  hidden_at TEXT NOT NULL
);
