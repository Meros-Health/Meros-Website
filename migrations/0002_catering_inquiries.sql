-- Catering inquiries from /catering.
--
-- One row per submitted form. Unlike an order this is not idempotent: a
-- business that sends two inquiries has sent two inquiries, and losing the
-- second would be worse than storing it twice.
--
-- This row deliberately carries the contact's name, email and phone. It is a
-- sales lead the store acts on, not telemetry, and lib/log.ts keeps the same
-- fields out of the Worker logs (see the privacy policy).
--
-- Read them with:
--   wrangler d1 execute meros-orders --remote \
--     --command "SELECT created_at, business, contact_name, email, phone FROM catering_inquiries ORDER BY created_at DESC LIMIT 50"
CREATE TABLE IF NOT EXISTS catering_inquiries (
  id           TEXT PRIMARY KEY,
  created_at   TEXT NOT NULL,
  business     TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  headcount    TEXT,            -- free text: "40 people", not parsed
  needed_on    TEXT,            -- free text: the date or cadence they asked for
  message      TEXT
);

CREATE INDEX IF NOT EXISTS idx_catering_inquiries_created_at ON catering_inquiries (created_at);
