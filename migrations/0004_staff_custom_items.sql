-- Items staff added to the inventory board (/staff) themselves, from the board.
--
-- 0003 put the catalog in code on purpose: the 70 ingredients come from the
-- registry (lib/menu/menu.json) and the supplies are a hand-ordered list in
-- lib/staff/catalog.ts, so the registry stays the single source of truth for
-- anything a customer can order. That is still true. This table is the other
-- half of the story: things the store started carrying mid-shift, which staff
-- need to track stock on today rather than after the next deploy.
--
-- These never reach the builder, the cart, checkout or the Menu TV. Nothing
-- outside app/staff and components/staff reads them.
--
-- id is derived server-side from the name and namespaced "custom:", never
-- taken from the request body. The namespace is what lets DELETE refuse any
-- id that is not one of these, which is what keeps the built-in catalog rows
-- unremovable from the board.
CREATE TABLE staff_custom_items (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  section    TEXT NOT NULL,   -- a group name from lib/staff/catalog.ts
  created_by TEXT,            -- Cloudflare Access email; null in development
  created_at TEXT NOT NULL
);

-- The board reads these grouped by section on every poll.
CREATE INDEX idx_staff_custom_items_section ON staff_custom_items (section);
