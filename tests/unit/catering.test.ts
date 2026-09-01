// @vitest-environment node
//
// The /catering content is copy plus claims that can silently rot: the yogurt
// list names bases that must still exist on the menu, the business-card URL
// must still resolve, and the page must not drift back into offering supply.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CATERING_ACCOUNT_NOTE,
  CATERING_AUDIENCE,
  CATERING_FORMATS,
  CATERING_HERO,
  CATERING_NOTES,
  CATERING_STEPS,
  CATERING_YOGURTS,
  cateringServiceSchema,
} from "@/lib/catering/content";
import { getIngredient } from "@/lib/menu/ingredients";
import { getStepIngredients } from "@/lib/menu/buildConfig";

const ROOT = path.resolve(__dirname, "../..");

/** Line and block comments out, so an assertion reads the code's claims only. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

const everyString = [
  CATERING_HERO.eyebrow,
  CATERING_HERO.title,
  CATERING_HERO.lead,
  CATERING_ACCOUNT_NOTE,
  ...CATERING_AUDIENCE,
  ...[...CATERING_FORMATS, ...CATERING_YOGURTS, ...CATERING_NOTES, ...CATERING_STEPS].flatMap(
    (item) => [item.name, item.body]
  ),
];

describe("the yogurt list against the menu", () => {
  it("names yogurts that still exist in menu.json", () => {
    const missing = CATERING_YOGURTS.filter((y) => !getIngredient(y.id));
    expect(missing.map((y) => y.id), "catering ids with no ingredient").toEqual([]);
  });

  it("offers exactly the bases the store carries, no more and no fewer", () => {
    // The menu's base step is what the store actually pours, so the two have
    // to be the same set: a base added there and not here is a product we sell
    // retail but never mention to a catering buyer, and one removed there and
    // left here is a product we advertise and cannot serve.
    const onMenu = getStepIngredients("base").map((i) => i.id).sort();
    const onPage = CATERING_YOGURTS.map((y) => y.id).sort();
    expect(onPage).toEqual(onMenu);
  });

  it("uses no symbols the display face cannot draw", () => {
    // Montage Serif has no percent glyph: "High Protein 0% Fat" rendered as
    // "0     FAT" in the heading. Headings here are name fields, so guard them.
    const headings = CATERING_YOGURTS.map((y) => y.name);
    expect(headings.filter((h) => /[%&@#*+=<>]/.test(h))).toEqual([]);
  });
});

describe("scope: catering, not supply", () => {
  // We serve volume for an occasion, eaten the day it is served.
  // Supplying yogurt for a business to hold as stock is the lane a BC dairy
  // licensee manufactures and distributes in, and not one we are licensed for.
  // The page drifting back toward that language is the regression this catches.
  it("never offers wholesale or supply in the copy", () => {
    const forbidden = /\b(wholesale|resell|resale|distribut\w*|stock up|for resale)\b/i;
    expect(everyString.filter((s) => forbidden.test(s))).toEqual([]);
  });

  it("says the yogurt is for the day it is served", () => {
    // The one fact that has to survive a copy edit. The wording is free: the
    // scope is carried by the page being about occasions rather than by any
    // single sentence, and this is just its concrete anchor.
    const all = everyString.join(" ").toLowerCase();
    expect(all, "the copy must say the yogurt is for the day it is served").toMatch(
      /the day it is served|on the day|same day/
    );
  });

  it("names no serving format, because none is decided", () => {
    // An earlier draft said "disposable containers". Kim does not know yet
    // whether an order goes out in tubs, paper bowls, or the glassware the
    // store already owns, and it will likely differ per order. Naming a format
    // on a page a printed QR code points at is a promise nobody made, so the
    // copy says "delivered, ready to serve" and stops.
    //
    // "Bowls" is exempt: an individual bowl is a menu item, not serve-ware.
    const formats = /\b(disposable|compostable|single[- ]use|tubs?|jars?|glassware|glasses|cups?|plates?|trays?|packaging|containers?)\b/i;
    expect(everyString.filter((s) => formats.test(s))).toEqual([]);
  });

  it("scopes by what we do, not by what we refuse", () => {
    // "We do not supply yogurt to store" was the first draft of the note above.
    // It reads as a warning to a buyer who has not asked for anything wrong
    // yet, and a negation is the one shape the house copy rules ban outright.
    const negations = /\bwe do not\b|\bwe cannot\b|\bnot for (storage|later|future)\b|\bdo not store\b/i;
    expect(everyString.filter((s) => negations.test(s))).toEqual([]);
  });

  it("exposes no wholesale route", () => {
    // Read the code, not the comments: next.config.ts explains at length why
    // there is no /wholesale, and a plain substring check would fail on its
    // own reasoning.
    const config = stripComments(readFileSync(path.join(ROOT, "next.config.ts"), "utf8"));
    expect(config).not.toContain("/wholesale");
    const nav = stripComments(readFileSync(path.join(ROOT, "lib/nav.ts"), "utf8"));
    expect(nav).not.toMatch(/wholesale|partners/i);
  });
});

describe("routing", () => {
  it("keeps the business card's short URL pointed at the page", () => {
    const config = readFileSync(path.join(ROOT, "next.config.ts"), "utf8");
    expect(config).toContain('["/cater", "/catering"]');
  });

  it("carries one Catering entry in the nav", () => {
    // lib/nav.ts is the route index the navbar and the footer both render.
    const nav = readFileSync(path.join(ROOT, "lib/nav.ts"), "utf8");
    expect(nav).toContain('{ label: "Catering", href: "/catering" }');
  });
});

describe("copy", () => {
  // Em dashes are covered repo wide by tests/unit/no-em-dash.test.ts.

  it("gives no tax or accounting advice", () => {
    // The page tells businesses their invoice is itemised and retrievable,
    // which is a fact about our paperwork. What any of it means for their
    // taxes depends on their own position, is advice we are not qualified to
    // give, and is the kind of claim that costs trust when it turns out wrong.
    const advice =
      /\bwrite ?[- ]?off\b|\btax[- ]deductible\b|\bdeduct\w*|\bclaim(ing)? (it |them |that )?back\b|\brebate\b|\breimburs\w*|\btax credit\b|\bsave (you |your business )?money\b|\bexpense it\b/i;
    expect(everyString.filter((s) => advice.test(s))).toEqual([]);
  });

  it("promises no price, lead time or minimum, none of which are set", () => {
    // The page is read by buyers. A number here is a commitment nobody made.
    const forbidden = /\$\d|\bper kg\b|\b\d+\s*(hours|hrs|days|business days)\b|\bminimum order\b/i;
    expect(everyString.filter((s) => forbidden.test(s))).toEqual([]);
  });
});

describe("service schema", () => {
  const graph = cateringServiceSchema("https://example.com")["@graph"];

  it("attaches one catering service to the store's Restaurant node", () => {
    expect(graph).toHaveLength(1);
    expect(graph[0].serviceType).toBe("Catering");
    expect(graph[0].provider["@id"]).toBe("https://example.com/#restaurant");
    expect(graph[0].url).toBe("https://example.com/catering");
  });
});

describe("what the form does with what it collects", () => {
  const privacy = stripComments(readFileSync(path.join(ROOT, "app/privacy/page.tsx"), "utf8"));
  const terms = stripComments(readFileSync(path.join(ROOT, "app/terms/page.tsx"), "utf8"));
  const form = stripComments(
    readFileSync(path.join(ROOT, "components/catering/CateringInquiryForm.tsx"), "utf8")
  );

  // A processor named in the code and not in the policy is an undisclosed
  // recipient of a lead's name, email, phone and message. Each entry is the
  // file that would introduce one, so adding a processor without a policy line
  // fails here rather than in front of a privacy commissioner.
  const PROCESSORS = [
    { name: "Resend", source: "lib/catering/runtime.ts" },
    { name: "Stripe", source: "app/actions/checkout.ts" },
  ];

  it.each(PROCESSORS)("names $name in the privacy policy once the code uses it", ({ name, source }) => {
    const code = stripComments(readFileSync(path.join(ROOT, source), "utf8"));
    if (!new RegExp(name, "i").test(code)) return; // not wired up yet
    expect(privacy, `${name} handles submitted data but /privacy does not name it`).toContain(name);
  });

  it("links the policy from the form, where consent is actually given", () => {
    // The policy treats a submit as consent. Consent given without the terms
    // in reach is not informed consent under PIPA.
    expect(form).toContain('href="/privacy"');
  });

  it("tells a catering buyer an inquiry is not a booking", () => {
    // The retail refund and pickup rules in /terms are written for a bowl. A
    // quote, not those sections, governs a catered event.
    expect(terms.toLowerCase()).toContain("not a booking");
  });
});
