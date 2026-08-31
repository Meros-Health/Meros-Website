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
}
