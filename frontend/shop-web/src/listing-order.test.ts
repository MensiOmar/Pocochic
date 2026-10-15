import { describe, expect, it } from "vitest";
import {
  commitBound,
  dinarDomain,
  listingQuery,
  matchesPrice,
  orderStyles,
  parseSort,
  shiftSpan,
  slideThumb,
  spanFromQuery,
  spanQuery,
} from "./listing-order";

const rows = [
  { displayName: "Pin 10", priceCents: 2000 },
  { displayName: "Astro", priceCents: 1600 },
  { displayName: "Pin 2", priceCents: 2000 },
  { displayName: "b-mo", priceCents: 3500 },
];

describe("orderStyles", () => {
  it("keeps the API order when sort is unset", () => {
    const next = orderStyles(rows, null, "en");
    expect(next).not.toBe(rows);
    expect(next.map((item) => item.displayName)).toEqual(["Pin 10", "Astro", "Pin 2", "b-mo"]);
    expect(rows.map((item) => item.displayName)).toEqual(["Pin 10", "Astro", "Pin 2", "b-mo"]);
  });

  it("sorts A-Z and Z-A with the active locale", () => {
    expect(orderStyles(rows, "az", "en").map((item) => item.displayName)).toEqual([
      "Astro",
      "b-mo",
      "Pin 2",
      "Pin 10",
    ]);
    expect(orderStyles(rows, "za", "ar").map((item) => item.displayName)).toEqual([
      "Pin 10",
      "Pin 2",
      "b-mo",
      "Astro",
    ]);
  });

  it("sorts by price and breaks a tie A-Z", () => {
    expect(orderStyles(rows, "cheap", "fr").map((item) => item.displayName)).toEqual([
      "Astro",
      "Pin 2",
      "Pin 10",
      "b-mo",
    ]);
    expect(orderStyles(rows, "pricey", "en").map((item) => item.displayName)).toEqual([
      "b-mo",
      "Pin 2",
      "Pin 10",
      "Astro",
    ]);
  });
});

describe("dinar bounds", () => {
  it("reads whole dinars from the loaded prices", () => {
    expect(dinarDomain([])).toBeNull();
    expect(dinarDomain([1250, 100, 6700])).toEqual({ floor: 1, ceil: 67 });
    expect(dinarDomain([1200, 1200])).toEqual({ floor: 12, ceil: 12 });
    expect(dinarDomain([1250])).toEqual({ floor: 12, ceil: 13 });
  });

  it("keeps 12.50 DT inside a max of 12", () => {
    expect(matchesPrice(1250, 12, 12)).toBe(true);
    expect(matchesPrice(1299, 1, 12)).toBe(true);
    expect(matchesPrice(1300, 1, 12)).toBe(false);
    expect(matchesPrice(1200, 12, 40)).toBe(true);
    expect(matchesPrice(1199, 12, 40)).toBe(false);
  });

  it("clamps query bounds and drops a crossed pair", () => {
    expect(spanFromQuery("0", "12", 1, 67)).toEqual({ min: 1, max: 12 });
    expect(spanFromQuery("12", "400", 1, 67)).toEqual({ min: 12, max: 67 });
    expect(spanFromQuery("80", "10", 1, 67)).toEqual({ min: 1, max: 67 });
    expect(spanFromQuery("foo", "", 1, 67)).toEqual({ min: 1, max: 67 });
    expect(spanFromQuery("4", "4", 1, 67)).toEqual({ min: 4, max: 4 });
  });
});

describe("commitBound", () => {
  const span = { min: 8, max: 30 };
  const domain = { floor: 1, ceil: 67 };

  it("updates one bound and leaves the other where it is", () => {
    expect(commitBound("min", "12", span, domain, "input")).toEqual({ min: 12, max: 30 });
    expect(commitBound("max", "40", span, domain, "input")).toEqual({ min: 8, max: 40 });
    expect(commitBound("min", "12a", span, domain, "input")).toEqual({ min: 12, max: 30 });
    expect(commitBound("min", "40", span, domain, "input")).toEqual(span);
    expect(commitBound("max", "2", span, domain, "input")).toEqual(span);
    expect(commitBound("min", "99", span, domain, "input")).toEqual(span);
    expect(commitBound("min", "", span, domain, "input")).toEqual(span);
  });

  it("snaps a crossing blur onto the other bound and restores junk", () => {
    expect(commitBound("min", "40", span, domain, "blur")).toEqual({ min: 30, max: 30 });
    expect(commitBound("max", "2", span, domain, "blur")).toEqual({ min: 8, max: 8 });
    expect(commitBound("max", "99", span, domain, "blur")).toEqual(span);
    expect(commitBound("min", "", span, domain, "blur")).toEqual(span);
    expect(commitBound("min", "12345", span, domain, "blur")).toEqual(span);
  });
});

describe("listing query", () => {
  it("ignores an unknown sort", () => {
    expect(parseSort("cheap")).toBe("cheap");
    expect(parseSort("pricey")).toBe("pricey");
    expect(parseSort("az")).toBe("az");
    expect(parseSort("za")).toBe("za");
    expect(parseSort("newest")).toBeNull();
    expect(parseSort("AZ")).toBeNull();
    expect(parseSort(["za"])).toBe("za");
    expect(parseSort(["nope"])).toBeNull();
    expect(parseSort(undefined)).toBeNull();
  });

  it("omits a full span and an unset sort", () => {
    expect(spanQuery({ min: 1, max: 67 }, 1, 67)).toEqual({});
    expect(spanQuery({ min: 4, max: 67 }, 1, 67)).toEqual({ min: "4" });
    expect(spanQuery({ min: 1, max: 20 }, 1, 67)).toEqual({ max: "20" });
    expect(
      listingQuery({ q: "  ", page: 1, sort: null, span: { min: 1, max: 67 }, floor: 1, ceil: 67 }),
    ).toEqual({});
    expect(
      listingQuery({ q: "pin", page: 2, sort: "cheap", span: { min: 4, max: 67 }, floor: 1, ceil: 67 }),
    ).toEqual({ q: "pin", page: "2", sort: "cheap", min: "4" });
  });
});

describe("slider drag", () => {
  const domain = { floor: 1, ceil: 67 };
  const span = { min: 10, max: 20 };

  it("stops a thumb on the other thumb", () => {
    expect(slideThumb("min", 50, span, domain)).toEqual({ min: 20, max: 20 });
    expect(slideThumb("max", 4, span, domain)).toEqual({ min: 10, max: 10 });
    expect(slideThumb("min", 12.4, span, domain)).toEqual({ min: 12, max: 20 });
  });

  it("moves the whole span without changing its width", () => {
    expect(shiftSpan(30, 3, 10, span, domain)).toEqual({ min: 27, max: 37 });
    expect(shiftSpan(0, 0, 10, span, domain)).toEqual({ min: 1, max: 11 });
    expect(shiftSpan(80, 0, 10, span, domain)).toEqual({ min: 57, max: 67 });
  });
});
