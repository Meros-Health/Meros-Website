import { describe, expect, it } from "vitest";
import { linesMissingBase } from "@/lib/checkout/lines";
import { customLine, signatureLine } from "./helpers/cartFixtures";

// C3-05: the drawer and the checkout page refuse to proceed while a signature
// line has no yogurt, before the server has to.
describe("linesMissingBase", () => {
  it("names signature lines with no yogurt and nothing else", () => {
    const noBase = { ...signatureLine("nb", "moment", "medium", 12), base: undefined };
    const items = [customLine("c", "medium", { base: ["plain-greek-yogurt"] }), signatureLine("ok", "moment", "medium", 12), noBase];
    expect(linesMissingBase(items).map((i) => i.lineId)).toEqual(["nb"]);
    expect(linesMissingBase([])).toEqual([]);
  });
});
