// @vitest-environment node
//
// submitCheckout called directly, the way the stress test's Node harness did.
// Case ids refer to docs/qa/ordering-stress-test-2026-08-26.md.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_CHECKOUT_ENABLED = "true";
});

import { submitCheckout } from "@/app/actions/checkout";
import { submitContactForm } from "@/app/actions/contact";
import { makeIdempotencyKey, resetOrderDedupeForTests } from "@/lib/checkout/idempotency";
import { IDLE, VALID_CUSTOMER, fileField, makeFormData } from "./helpers/formData";
import { customLine, signatureLine } from "./helpers/cartFixtures";

function customer(overrides: Record<string, string | Blob> = {}): FormData {
  return makeFormData({ ...VALID_CUSTOMER, idempotencyKey: makeIdempotencyKey(), ...overrides });
}

const plainMedium = () =>
  customLine("plain-medium", "medium", { base: ["plain-greek-yogurt"] }, { unitPrice: 12 });
const momentMedium = () => signatureLine("moment-medium", "moment", "medium", 12);

async function submit(lines: unknown, formData: FormData = customer()) {
  return submitCheckout(JSON.stringify(lines), IDLE, formData);
}

let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  resetOrderDedupeForTests();
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  errorSpy.mockRestore();
});

describe("submitCheckout: happy path", () => {
  it("accepts a valid mixed cart and prices it from the menu", async () => {
    const result = await submit([plainMedium(), momentMedium()]);
    expect(result.status).toBe("success");
    expect(result.orderRef).toMatch(/^MER/);
    const logged = logSpy.mock.calls[0][1] as { total: number; lineCount: number };
    expect(logged.total).toBe(24);
    expect(logged.lineCount).toBe(2);
  });

  it("prices the enhancer bundle and extra fruits correctly (B9)", async () => {
    const line = customLine(
      "big",
      "medium",
      {
        base: ["plain-greek-yogurt"],
        fruits: ["strawberries", "nectarines", "pineapples", "dragon-fruit", "blueberries", "peaches", "grapes", "papaya", "blackberries", "mangoes", "bananas", "melon"],
        enhancers: ["whey-protein-isolate", "collagen-peptides", "creatine-monohydrate", "greens-powder"],
      },
      { unitPrice: 42 }
    );
    const result = await submit([line]);
    expect(result.status).toBe("success");
  });
});

describe("F7: the server honours the checkout flag", () => {
  it("rejects every order while the flag is off", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_ENABLED", "false");
    const { submitCheckout: closedSubmit } = await import("@/app/actions/checkout");
    const result = await closedSubmit(JSON.stringify([momentMedium()]), IDLE, customer());
    expect(result).toMatchObject({ status: "error", code: "closed" });
    expect(logSpy).not.toHaveBeenCalled();
  });
});

describe("F4 / F5-20: a bad request never throws out of the action", () => {
  it("treats a File in a string field as a missing field", async () => {
    const result = await submit([momentMedium()], customer({ name: fileField() }));
    expect(result).toMatchObject({ status: "error", code: "form" });
  });

  it("rejects a null element in the cart array as invalid", async () => {
    const result = await submit([null]);
    expect(result).toMatchObject({ status: "error", code: "invalid" });
  });

  it("rejects a string element and a nested array", async () => {
    expect((await submit(["x"])).code).toBe("invalid");
    expect((await submit([[]])).code).toBe("invalid");
  });

  it("returns a generic error instead of throwing when something unexpected breaks", async () => {
    // A FormData whose get() throws stands in for any runtime failure.
    const broken = { get: () => { throw new Error("boom"); } } as unknown as FormData;
    const result = await submitCheckout(JSON.stringify([momentMedium()]), IDLE, broken);
    expect(result).toMatchObject({ status: "error", code: "unknown" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(errorSpy.mock.calls[0])).not.toContain(VALID_CUSTOMER.email);
  });
});

describe("F5ui: errors identify the line", () => {
  it("echoes the lineId of the rejected line and leaves valid lines alone", async () => {
    const bad = signatureLine("too-many", "moment", "medium", 12, { quantity: 500 });
    const result = await submit([momentMedium(), bad]);
    expect(result).toMatchObject({ status: "error", code: "quantity", lineId: "too-many" });
    expect(result.message).toMatch(/99/);
  });

  it("does not reflect an over-long or non-string lineId", async () => {
    const bad = { ...momentMedium(), lineId: "x".repeat(65), quantity: 0 };
    expect((await submit([bad])).lineId).toBeUndefined();
    const numeric = { ...momentMedium(), lineId: 42, quantity: 0 };
    expect((await submit([numeric])).lineId).toBeUndefined();
  });
});

describe("ST-12 / F5-07: the server normalises before pricing", () => {
  it("rejects duplicate ingredient ids instead of pricing them", async () => {
    const line = customLine(
      "dupes",
      "medium",
      { base: ["plain-greek-yogurt"], fruits: ["strawberries", "strawberries", "strawberries", "strawberries"] },
      { unitPrice: 16 }
    );
    const result = await submit([line]);
    expect(result).toMatchObject({ status: "error", code: "unavailable", lineId: "dupes" });
  });

  it("rejects fifty duplicates in one step", async () => {
    const line = customLine(
      "fifty",
      "medium",
      { base: ["plain-greek-yogurt"], fruits: Array(50).fill("strawberries") },
      { unitPrice: 108 }
    );
    expect((await submit([line])).code).toBe("unavailable");
  });

  it("rejects two picks on a select-one step", async () => {
    const line = customLine("two-bases", "medium", { base: ["plain-greek-yogurt", "vanilla-greek-yogurt"] }, { unitPrice: 12 });
    expect((await submit([line])).code).toBe("unavailable");
  });
});

describe("H4 / F6: the displayed price must match the menu", () => {
  it("rejects a stale unit price rather than charging a different amount", async () => {
    const stale = customLine("stale", "medium", { base: ["plain-greek-yogurt"] }, { unitPrice: 10 });
    const result = await submit([stale]);
    expect(result).toMatchObject({ status: "error", code: "price-changed", lineId: "stale" });
  });

  it("never prices from the client (F6): a 0.01 price is refused, not honoured", async () => {
    const evil = { ...momentMedium(), unitPrice: 0.01, name: "Evil" };
    const result = await submit([evil]);
    expect(result.status).toBe("error");
    expect(logSpy).not.toHaveBeenCalled();
  });

  it("tolerates float noise on an otherwise equal price", async () => {
    const line = { ...momentMedium(), unitPrice: 12.0000001 };
    expect((await submit([line])).status).toBe("success");
  });
});

describe("F2: one submit attempt is one order", () => {
  it("returns the same orderRef for two submits with the same key", async () => {
    const key = makeIdempotencyKey();
    const form = () => customer({ idempotencyKey: key });
    const [a, b] = await Promise.all([submit([momentMedium()], form()), submit([momentMedium()], form())]);
    expect(a.status).toBe("success");
    expect(b.status).toBe("success");
    expect(a.orderRef).toBe(b.orderRef);
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it("creates distinct orders for distinct keys", async () => {
    const a = await submit([momentMedium()]);
    const b = await submit([momentMedium()]);
    expect(a.orderRef).not.toBe(b.orderRef);
  });

  it("requires a well-formed key", async () => {
    expect((await submit([momentMedium()], customer({ idempotencyKey: "" }))).code).toBe("invalid");
    expect((await submit([momentMedium()], customer({ idempotencyKey: "<script>" }))).code).toBe("invalid");
    const missing = makeFormData(VALID_CUSTOMER);
    expect((await submit([momentMedium()], missing)).code).toBe("invalid");
  });
});

describe("F8: no personal data in production logs", () => {
  it("logs only the summary when NODE_ENV is production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_CHECKOUT_ENABLED", "true");
    const { submitCheckout: prodSubmit } = await import("@/app/actions/checkout");
    const result = await prodSubmit(JSON.stringify([momentMedium()]), IDLE, customer());
    expect(result.status).toBe("success");
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain(VALID_CUSTOMER.email);
    expect(logged).not.toContain(VALID_CUSTOMER.phone);
    expect(logged).not.toContain(VALID_CUSTOMER.name);
    expect(logged).toContain(result.orderRef);
  });
});

describe("F5: validation matrix (confirmed-correct boundaries stay locked)", () => {
  const cases: Array<[string, unknown, string]> = [
    ["non-JSON", "not json", "cart"],
    ["non-array", { a: 1 }, "cart"],
    ["empty array", [], "cart"],
    ["51 lines", Array(51).fill(null).map(() => momentMedium()), "cart"],
    ["quantity 0", [{ ...momentMedium(), quantity: 0 }], "quantity"],
    ["quantity 100", [{ ...momentMedium(), quantity: 100 }], "quantity"],
    ["quantity string", [{ ...momentMedium(), quantity: "99" }], "quantity"],
    ["quantity negative", [{ ...momentMedium(), quantity: -1 }], "quantity"],
    ["quantity fraction", [{ ...momentMedium(), quantity: 2.5 }], "quantity"],
    ["quantity boolean", [{ ...momentMedium(), quantity: true }], "quantity"],
    ["quantity null", [{ ...momentMedium(), quantity: null }], "quantity"],
    ["quantity max safe", [{ ...momentMedium(), quantity: Number.MAX_SAFE_INTEGER }], "quantity"],
    ["51 picks", [customLine("p", "medium", { base: ["plain-greek-yogurt"], fruits: Array(51).fill("strawberries") }, { unitPrice: 12 })], "invalid"],
    ["unknown ingredient", [customLine("u", "medium", { base: ["plain-greek-yogurt"], fruits: ["nope"] }, { unitPrice: 12 })], "unavailable"],
    ["wrong step", [customLine("w", "medium", { base: ["plain-greek-yogurt"], fruits: ["almonds"] }, { unitPrice: 12 })], "unavailable"],
    ["unknown step", [customLine("s", "medium", { base: ["plain-greek-yogurt"], junk: ["strawberries"] }, { unitPrice: 12 })], "unavailable"],
    ["unknown size", [customLine("z", "huge", { base: ["plain-greek-yogurt"] }, { unitPrice: 12 })], "unavailable"],
    ["signature wrong size", [signatureLine("sm", "rise", "large", 15)], "unavailable"],
    ["unknown product", [signatureLine("np", "nope", "medium", 12)], "unavailable"],
    ["incomplete bowl", [customLine("i", "medium", { fruits: ["strawberries"] }, { unitPrice: 12 })], "invalid"],
    ["unknown kind", [{ ...momentMedium(), kind: "weird" }], "invalid"],
    ["selection not an object", [{ ...plainMedium(), selection: "x" }], "invalid"],
    ["steps not an object", [{ ...plainMedium(), selection: { sizeId: "medium", steps: [] } }], "invalid"],
    ["step value not an array", [{ ...plainMedium(), selection: { sizeId: "medium", steps: { base: "plain-greek-yogurt" } } }], "invalid"],
    ["missing unitPrice", [{ ...momentMedium(), unitPrice: undefined }], "invalid"],
    ["string unitPrice", [{ ...momentMedium(), unitPrice: "12" }], "invalid"],
  ];

  for (const [label, payload, code] of cases) {
    it(`rejects ${label} with code ${code}`, async () => {
      const json = typeof payload === "string" ? payload : JSON.stringify(payload);
      const result = await submitCheckout(json, IDLE, customer());
      expect(result.status).toBe("error");
      expect(result.code).toBe(code);
    });
  }

  it("accepts the boundaries: 50 lines, 99 quantity, 50 picks after dedupe is not needed", async () => {
    const fifty = Array(50).fill(null).map((_, i) => ({ ...momentMedium(), lineId: `l${i}` }));
    expect((await submit(fifty)).status).toBe("success");
    expect((await submit([{ ...momentMedium(), quantity: 99 }])).status).toBe("success");
  });

  it("rejects prototype keys as step ids", async () => {
    const json = '[{"lineId":"p","kind":"custom","productId":"custom-bowl","quantity":1,"unitPrice":12,"selection":{"sizeId":"medium","steps":{"base":["plain-greek-yogurt"],"__proto__":["x"],"constructor":["y"]}}}]';
    const result = await submitCheckout(json, IDLE, customer());
    expect(result).toMatchObject({ status: "error", code: "invalid" });
  });
});

describe("F9: contact form", () => {
  it("accepts a valid message", async () => {
    const result = await submitContactForm(IDLE, makeFormData({ name: "A", email: "a@b.co", message: "hi" }));
    expect(result.status).toBe("success");
  });

  it("treats a File in the message field as missing instead of throwing", async () => {
    const result = await submitContactForm(IDLE, makeFormData({ name: "A", email: "a@b.co", message: fileField() }));
    expect(result).toMatchObject({ status: "error", message: "All fields are required." });
  });

  it("logs only the message length in production", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    const { submitContactForm: prodContact } = await import("@/app/actions/contact");
    await prodContact(IDLE, makeFormData({ name: "Secret Name", email: "secret@example.com", message: "private" }));
    const logged = JSON.stringify(logSpy.mock.calls);
    expect(logged).not.toContain("secret@example.com");
    expect(logged).not.toContain("private");
    expect(logged).toContain("messageLength");
  });
});

describe("F5-26 / F5-28: field caps", () => {
  it("rejects over-long checkout fields with a field-specific message", async () => {
    expect((await submit([momentMedium()], customer({ name: "x".repeat(101) }))).message).toMatch(/Name must be 100/);
    expect((await submit([momentMedium()], customer({ phone: "1".repeat(31) }))).message).toMatch(/Phone must be 30/);
    expect((await submit([momentMedium()], customer({ email: "a".repeat(250) + "@b.co" }))).message).toMatch(/Email must be 254/);
  });

  it("rejects an over-long contact message", async () => {
    const result = await submitContactForm(IDLE, makeFormData({ name: "A", email: "a@b.co", message: "x".repeat(2001) }));
    expect(result.message).toMatch(/Message must be 2000/);
  });

  it("still accepts a phone with letters as long as ten digits are present (documented rough edge)", async () => {
    expect((await submit([momentMedium()], customer({ phone: "abc1234567890xyz" }))).status).toBe("success");
  });
});

describe("signature additions and removals", () => {
  const modded = (lineId: string, mods: unknown, unitPrice: number) =>
    signatureLine(lineId, "moment", "medium", unitPrice, { mods: mods as never });

  it("prices valid mods from the menu and names the change on the order line", async () => {
    const result = await submit([modded("m", { additions: ["mangoes", "maca-powder"], removals: ["house-granola"] }, 17)]);
    expect(result.status).toBe("success");
    const logged = logSpy.mock.calls[0][1] as { items: Array<{ name: string; unitPrice: number }> };
    expect(logged.items[0].unitPrice).toBe(17);
    expect(logged.items[0].name).toBe("The Moment · Medium · Add Mangoes, Maca Powder · No House Granola");
  });

  it("accepts an absent or empty mods field as no change", async () => {
    expect((await submit([modded("e", { additions: [], removals: [] }, 12)])).status).toBe("success");
    expect((await submit([modded("n", undefined, 12)])).status).toBe("success");
  });

  const rejected: Array<[string, unknown, number, string]> = [
    ["three additions", { additions: ["mangoes", "pineapples", "grapes"], removals: [] }, 18, "unavailable"],
    ["three removals", { additions: [], removals: ["house-granola", "bananas", "chia-seeds"] }, 12, "unavailable"],
    ["removal of the base", { additions: [], removals: ["plain-greek-yogurt"] }, 12, "unavailable"],
    ["addition already in the recipe", { additions: ["blueberries"], removals: [] }, 14, "unavailable"],
    ["addition of a base", { additions: ["vanilla-greek-yogurt"], removals: [] }, 12, "unavailable"],
    ["unknown addition", { additions: ["nope"], removals: [] }, 14, "unavailable"],
    ["duplicate addition", { additions: ["mangoes", "mangoes"], removals: [] }, 16, "unavailable"],
    ["price without the addition", { additions: ["mangoes"], removals: [] }, 12, "price-changed"],
    ["mods as a string", "mangoes", 12, "invalid"],
    ["mods as an array", ["mangoes"], 12, "invalid"],
    ["additions not an array", { additions: "mangoes" }, 12, "invalid"],
    ["non-string id", { additions: [42] }, 12, "invalid"],
    ["51 ids", { additions: Array(51).fill("mangoes") }, 12, "invalid"],
  ];
  for (const [label, mods, unitPrice, code] of rejected) {
    it(`rejects ${label} with code ${code}`, async () => {
      const result = await submit([modded("bad", mods, unitPrice)]);
      expect(result).toMatchObject({ status: "error", code, lineId: "bad" });
      expect(logSpy).not.toHaveBeenCalled();
    });
  }

  it("still rejects an unknown size when mods are present", async () => {
    const line = signatureLine("sz", "rise", "large", 17, { mods: { additions: ["mangoes"], removals: [] } });
    expect((await submit([line])).code).toBe("unavailable");
  });
});
