// In-memory stand-in for the two statements lib/catering/inquiryStore.ts
// issues: the insert, and the hourly count the notification throttle reads.
// Separate from FakeD1 so the two stores' fakes never drift into one query
// dispatcher that has to know about both tables.
import type { D1Like, D1PreparedLike } from "@/lib/checkout/orderStore";

export type FakeInquiryRow = {
  id: string;
  created_at: string;
  business: string;
  contact_name: string;
  email: string;
  phone: string | null;
  headcount: string | null;
  needed_on: string | null;
  message: string | null;
};

export class FakeInquiryD1 implements D1Like {
  readonly rows: FakeInquiryRow[] = [];
  failing = false;

  // An arrow class field, not a method: the nested statement object closes over
  // `this` lexically, which the linter's no-this-alias rule requires.
  prepare = (query: string): D1PreparedLike => {
    let bound: unknown[] = [];
    const stmt: D1PreparedLike = {
      bind: (...values: unknown[]) => {
        bound = values;
        return stmt;
      },
      run: async () => {
        if (this.failing) throw new Error("D1 unavailable");
        if (!query.startsWith("INSERT INTO catering_inquiries")) {
          throw new Error(`FakeInquiryD1: unexpected run() for ${query}`);
        }
        const [id, createdAt, business, contactName, email, phone, headcount, neededOn, message] =
          bound as [string, string, string, string, string, string | null, string | null, string | null, string | null];
        this.rows.push({
          id,
          created_at: createdAt,
          business,
          contact_name: contactName,
          email,
          phone,
          headcount,
          needed_on: neededOn,
          message,
        });
        return { meta: { changes: 1 } };
      },
      first: async <T,>(): Promise<T | null> => {
        if (this.failing) throw new Error("D1 unavailable");
        if (!query.startsWith("SELECT COUNT(*) AS n FROM catering_inquiries")) {
          throw new Error(`FakeInquiryD1: unexpected first() for ${query}`);
        }
        const [sinceIso] = bound as [string];
        const n = this.rows.filter((row) => row.created_at >= sinceIso).length;
        return { n } as T;
      },
    };
    return stmt;
  };
}
