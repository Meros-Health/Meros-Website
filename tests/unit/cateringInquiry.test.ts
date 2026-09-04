// @vitest-environment node
//
// submitCateringInquiry with the Workers runtime mocked. The page's only
// conversion: a lead that is not written to D1 must never be confirmed to the
// visitor, because nothing else is watching for it.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ctx = vi.hoisted(() => ({ env: null as Record<string, unknown> | null }));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: () => {
    if (!ctx.env) throw new Error("no cloudflare context");
    return { env: ctx.env };
  },
}));

// The request headers the per-IP limit reads. `unavailable` reproduces calling
// the action outside a request scope, where next/headers throws.
const req = vi.hoisted(() => ({ ip: "203.0.113.7" as string | null, unavailable: false }));

vi.mock("next/headers", () => ({
  headers: async () => {
    if (req.unavailable) throw new Error("headers() called outside a request scope");
    return { get: (name: string) => (name.toLowerCase() === "cf-connecting-ip" ? req.ip : null) };
  },
}));

import { submitCateringInquiry, type CateringInquiryState } from "@/app/actions/catering";
import { makeFormData } from "./helpers/formData";
import { FakeInquiryD1 } from "./helpers/fakeInquiryD1";
import { WRITE_MAX_PER_HOUR } from "@/lib/catering/rateLimit";

const IDLE: CateringInquiryState = { status: "idle", message: "" };

const SUCCESS_FRAGMENT_SOURCE =
  "Thanks, we have your inquiry. We will reply at the email you gave us. If it is time sensitive, call (778) 345-3023.";

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
  req.ip = "203.0.113.7";
  req.unavailable = false;
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
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

describe("notification", () => {
  const sent = () => fetchMock.mock.calls.map(([, init]) => JSON.parse((init as RequestInit).body as string));

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    ctx.env = { ORDERS_DB: db, RESEND_API_KEY: "re_test_key" };
  });

  it("emails the inquiry once the row is stored", async () => {
    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);

    const [body] = sent();
    expect(body.to).toEqual(["info@merosyogurt.com"]);
    expect(body.reply_to).toBe("sam@studios.example");
    expect(body.subject).toContain("Hamilton Street Studios");
    expect(body.text).toContain("One nut free tray, please.");
  });

  it("sends nothing when there is no API key, and still confirms", async () => {
    ctx.env = { ORDERS_DB: db };
    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still confirms when the send is rejected: the lead is already stored", async () => {
    fetchMock.mockResolvedValue(new Response("{}", { status: 500 }));
    const result = await submit();
    expect(result.status).toBe("success");
    expect(result.message).toBe(SUCCESS_FRAGMENT_SOURCE);
    expect(db.rows).toHaveLength(1);
  });

  it("still confirms when the send throws outright", async () => {
    fetchMock.mockRejectedValue(new Error("network down"));
    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
  });

  it("stores but does not email once the hour is flooded", async () => {
    const now = new Date().toISOString();
    for (let i = 0; i < 21; i += 1) {
      db.rows.push({
        id: `seed-${i}`,
        created_at: now,
        business: "bot",
        contact_name: "bot",
        email: "bot@spam.example",
        phone: null,
        headcount: null,
        needed_on: null,
        message: null,
      });
    }

    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(22);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not throttle on rows that fell outside the hour", async () => {
    const stale = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    for (let i = 0; i < 21; i += 1) {
      db.rows.push({
        id: `old-${i}`,
        created_at: stale,
        business: "bot",
        contact_name: "bot",
        email: "bot@spam.example",
        phone: null,
        headcount: null,
        needed_on: null,
        message: null,
      });
    }

    await submit();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("write limits", () => {
  const seed = (count: number, createdAt: string) => {
    for (let i = 0; i < count; i += 1) {
      db.rows.push({
        id: `seed-${i}`,
        created_at: createdAt,
        business: "bot",
        contact_name: "bot",
        email: "bot@spam.example",
        phone: null,
        headcount: null,
        needed_on: null,
        message: null,
      });
    }
  };

  it("stores nothing when the per-IP limiter refuses", async () => {
    ctx.env = { ORDERS_DB: db, CATERING_RATE_LIMITER: { limit: async () => ({ success: false }) } };

    const result = await submit();
    expect(result.status).toBe("error");
    expect(db.rows).toHaveLength(0);
  });

  it("says nothing about a limit, and offers a way through that works now", async () => {
    ctx.env = { ORDERS_DB: db, CATERING_RATE_LIMITER: { limit: async () => ({ success: false }) } };

    const result = await submit();
    // A script gets no signal it can tune against; a person gets the phone.
    expect(result.message).not.toMatch(/limit|rate|too many|slow down/i);
    expect(result.message).toContain("(778) 345-3023");
  });

  it("stores normally when the limiter allows", async () => {
    ctx.env = { ORDERS_DB: db, CATERING_RATE_LIMITER: { limit: async () => ({ success: true }) } };

    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
  });

  it("fails open when the limiter throws, rather than losing the lead", async () => {
    ctx.env = {
      ORDERS_DB: db,
      CATERING_RATE_LIMITER: {
        limit: async () => {
          throw new Error("rate limiter unavailable");
        },
      },
    };

    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
  });

  it("skips the per-IP limit when there is no address to count against", async () => {
    req.ip = null;
    ctx.env = { ORDERS_DB: db, CATERING_RATE_LIMITER: { limit: async () => ({ success: false }) } };

    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
  });

  it("skips the per-IP limit when there is no request scope to read", async () => {
    // The action is exercised directly here and in any future caller that is
    // not a request. A defence that cannot read its input must not be the
    // reason a lead is lost.
    req.unavailable = true;
    ctx.env = { ORDERS_DB: db, CATERING_RATE_LIMITER: { limit: async () => ({ success: false }) } };

    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(1);
  });

  it("refuses the write once the hour is past the global cap", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    seed(WRITE_MAX_PER_HOUR, new Date().toISOString());

    const result = await submit();
    expect(result.status).toBe("error");
    expect(db.rows).toHaveLength(WRITE_MAX_PER_HOUR);
  });

  it("ignores rows that fell outside the hour", async () => {
    seed(WRITE_MAX_PER_HOUR, new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString());

    const result = await submit();
    expect(result.status).toBe("success");
    expect(db.rows).toHaveLength(WRITE_MAX_PER_HOUR + 1);
  });
});
