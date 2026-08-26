// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { submitCheckout } from "@/app/actions/checkout";
import { IDLE, VALID_CUSTOMER, makeFormData } from "./helpers/formData";
import { signatureLine } from "./helpers/cartFixtures";

describe("submitCheckout: smoke", () => {
  it("accepts a valid signature line", async () => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    const cart = JSON.stringify([signatureLine("a", "moment", "medium", 12)]);
    const result = await submitCheckout(cart, IDLE, makeFormData(VALID_CUSTOMER));
    expect(result.status).toBe("success");
    expect(result.orderRef).toMatch(/^MER/);
  });
});
