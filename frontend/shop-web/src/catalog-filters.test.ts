import { describe, expect, it } from "vitest";
import { countCategory, countSection, matchesCatalog } from "./catalog-filters";

const items = [
  { section: "clothing", category: "hoodie", displayName: "Cats Don't Smoke" },
  { section: "clothing", category: "zip-hoodie", displayName: "Zipped Kitty Shades" },
  { section: "accessories", category: "earrings", displayName: "Star Studs" },
  { section: "makeup", category: "body", displayName: "SHEGLAM Hello Kitty Glow" },
];

describe("catalog filters", () => {
  it("counts a section and a leaf from the full list, ignoring the name query", () => {
    expect(countSection(items, "clothing")).toBe(2);
    expect(countCategory(items, "clothing", "hoodie")).toBe(1);
    expect(countCategory(items, "clothing", "zip-hoodie")).toBe(1);
  });

  it("keeps name search inside the chosen section and category", () => {
    const clothing = items.filter((item) => matchesCatalog(item, { section: "clothing", category: "", q: "kitty" }));
    expect(clothing.map((item) => item.displayName)).toEqual(["Zipped Kitty Shades"]);
    const hoodies = items.filter((item) => matchesCatalog(item, { section: "clothing", category: "hoodie", q: "kitty" }));
    expect(hoodies).toEqual([]);
    const all = items.filter((item) => matchesCatalog(item, { section: "", category: "", q: "" }));
    expect(all).toHaveLength(4);
  });
});
