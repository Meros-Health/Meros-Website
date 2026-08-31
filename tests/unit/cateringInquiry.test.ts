// @vitest-environment node
//
// submitCateringInquiry with the Workers runtime mocked. The page's only
// conversion: a lead that is not written to D1 must never be confirmed to the
// visitor, because nothing else is watching for it.
import { beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ env: null as Record<string, unknown> | null }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (!ctx.env) throw new Error("no cloudflare context");
    return { env: ctx.env };
  },
}));

import { submitCateringInquiry, type CateringInquiryState } from "@/app/actions/catering";
import { makeFormData } from "./helpers/formData";
import { FakeInquiryD1 } from "./helpers/fakeInquiryD1";

const IDLE: CateringInquiryState = { status: "idle", message: "" };

const VALID = {
  business: "Hamilton Street Studios",
  name: "Sam Reyes",
  email: "sam@studios.example",
  phone: "604-123-4567",
  headcount: "40 people",
  neededOn: "March 4",
  message: "One nut free tray, please.",
};

let db: FakeInquiryD1;

beforeEach(() => {
  db = new FakeInquiryD1();
  ctx.env = { ORDERS_DB: db };
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const submit = (overrides: Record<string, string> = {}) =>
  submitCateringInquiry(IDLE, makeFormData({ ...VALID, ...overrides }));

describe("happy path", () => {
  it("stores the inquiry and confirms it", async () => {
    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
    expect(db.rows[0]).toMatchObject({
      business: "Hamilton Street Studios",
      contact_name: "Sam Reyes",
      email: "sam@studios.example",
      headcount: "40 people",
    });
  });

  it("stores the optional fields as null rather than empty strings", async () => {
    await submitCateringInquiry(
      IDLE,
      makeFormData({ business: "Acme", name: "Jo", email: "jo@acme.example" })
    );
    expect(db.rows[0]).toMatchObject({ phone: null, headcount: null, needed_on: null, message: null });
  });
});

describe("validation", () => {
  it.each([
    ["business", "", "business name"],
    ["name", "", "your name"],
    ["email", "", "email address"],
    ["email", "not-an-email", "valid email"],
  ])("rejects %s = %j", async (field, value, fragment) => {
    const result = await submit({ [field]: value });
    expect(result.status).toBe("error");
    expect(result.message.toLowerCase()).toContain(fragment);
    expect(db.rows).toHaveLength(0);
  });

  it("names the field to focus so the error is fixable in one move", async () => {
    const result = await submit({ email: "nope" });
    expect(result.field).toBe("email");
  });

  it("rejects an over-long message without writing anything", async () => {
    const result = await submit({ message: "x".repeat(2001) });
    expect(result.status).toBe("error");
    expect(db.rows).toHaveLength(0);
  });
});

describe("bots", () => {
  it("absorbs a filled honeypot: no row, no distinguishable answer", async () => {
    const result = await submit({ website: "http://spam.example" });
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(0);
  });
});

describe("no durable destination", () => {
  it("refuses to confirm when the D1 binding is absent", async () => {
    ctx.env = {};
    const result = await submit();
    expect(result.status).toBe("error");
    expect(result.message).toContain("info@merosyogurt.com");
  });

  it("refuses to confirm when the write fails", async () => {
    db.failing = true;
    const result = await submit();
    expect(result.status).toBe("error");
    expect(result.message).toContain("778");
    expect(db.rows).toHaveLength(0);
  });

  it("refuses to confirm when there is no Workers context at all", async () => {
    ctx.env = null;
    const result = await submit();
    expect(result.status).toBe("error");
  });
});
