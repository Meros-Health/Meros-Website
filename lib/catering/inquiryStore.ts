// Durable catering inquiry record on D1. Server-only: imported by the catering
// action, never by client code.
//
// Reuses the site's single D1 database (the ORDERS_DB binding in
// wrangler.jsonc). A second binding for one table would be a second thing to
// create, migrate and forget about.
//
// Like the order record, and unlike logs (lib/log.ts), this row intentionally
// carries the contact's name, email and phone: it is the lead the store calls
// back, not telemetry.

import type { D1Like } from "@/lib/checkout/orderStore";

export type CateringInquiryRecord = {
  business: string;
  contactName: string;
  email: string;
  phone: string;
  headcount: string;
  neededOn: string;
  message: string;
};

export class D1CateringInquiryStore {
  constructor(private readonly db: D1Like) {}

  /**
   * Throws on failure rather than absorbing it. A lead we cannot store is a
   * lead nobody ever reads, so the action turns this into an error that hands
   * the visitor the phone number instead of a false confirmation.
   */
  async record(id: string, inquiry: CateringInquiryRecord): Promise<void> {
    await this.db
      .prepare(
        "INSERT INTO catering_inquiries (id, created_at, business, contact_name, email, phone, headcount, needed_on, message) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)"
      )
      .bind(
        id,
        new Date().toISOString(),
        inquiry.business,
        inquiry.contactName,
        inquiry.email,
        inquiry.phone || null,
        inquiry.headcount || null,
        inquiry.neededOn || null,
        inquiry.message || null
      )
      .run();
  }

  /**
   * How many inquiries landed since `sinceIso`. Feeds the notification throttle
   * in the action: the row is always stored, but a flood stops earning an email.
   *
   * Counting the table we already write is deliberate. A dedicated counter
   * would need its own binding, its own migration and its own expiry, to guard
   * a form that sees single digits a week.
   */
  async countSince(sinceIso: string): Promise<number> {
    const row = await this.db
      .prepare("SELECT COUNT(*) AS n FROM catering_inquiries WHERE created_at >= ?1")
      .bind(sinceIso)
      .first<{ n: number }>();
    return row?.n ?? 0;
  }
}
