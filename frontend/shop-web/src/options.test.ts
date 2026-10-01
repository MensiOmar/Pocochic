import type { Variant } from "@pocochic/contracts";
import { describe, expect, it } from "vitest";
import { defaultVariantId, optionKind, optionLabel, orderedVariants, showOptionRow } from "./options";

function variant(patch: Partial<Variant> & Pick<Variant, "id" | "size" | "reference">): Variant {
  return { priceCents: 4500, availableQty: 1, ...patch };
}

describe("product options", () => {
  it("orders sizes like the cards and references from A to Z", () => {
    const sizes = [
      variant({ id: "xl", size: "XL Oversize", reference: "" }),
      variant({ id: "s", size: "S", reference: "", availableQty: 0 }),
      variant({ id: "so", size: "S Oversize", reference: "" }),
    ];
    expect(orderedVariants(sizes).map((row) => row.id)).toEqual(["s", "so", "xl"]);
    const refs = [
      variant({ id: "wood", size: "", reference: "Wood Block", availableQty: 0 }),
      variant({ id: "axe", size: "", reference: "Axe" }),
    ];
    expect(orderedVariants(refs).map((row) => row.id)).toEqual(["axe", "wood"]);
    expect(defaultVariantId(refs)).toBe("axe");
  });

  it("labels a size, a reference, or both", () => {
    expect(optionLabel(variant({ id: "1", size: "M Oversize", reference: "" }))).toBe("M Oversize");
    expect(optionLabel(variant({ id: "2", size: "", reference: "Kuromi" }))).toBe("Kuromi");
    expect(optionLabel(variant({ id: "3", size: "M", reference: "Kitty Glow" }))).toBe("M · Kitty Glow");
  });

  it("hides the row only for a single blank size and names the heading from the axis", () => {
    expect(showOptionRow([variant({ id: "1", size: "", reference: "Shade" })])).toBe(false);
    expect(showOptionRow([variant({ id: "1", size: "M Oversize", reference: "" })])).toBe(true);
    expect(optionKind([variant({ id: "1", size: "M", reference: "" })])).toBe("size");
    const shades = [variant({ id: "1", size: "", reference: "Axe" }), variant({ id: "2", size: "", reference: "Bow" })];
    expect(showOptionRow(shades)).toBe(true);
    expect(optionKind(shades)).toBe("reference");
  });

  it("leaves a sold-out style with nothing selected", () => {
    const rows = [
      variant({ id: "s", size: "S", reference: "", availableQty: 0, priceCents: 5000 }),
      variant({ id: "m", size: "M", reference: "", availableQty: 0, priceCents: 4500 }),
    ];
    expect(defaultVariantId(rows)).toBeNull();
    expect(orderedVariants(rows).map((row) => row.id)).toEqual(["s", "m"]);
  });

  it("opens a partial style on the first in-stock size", () => {
    const rows = [
      variant({ id: "s", size: "S", reference: "", availableQty: 0 }),
      variant({ id: "so", size: "S Oversize", reference: "", availableQty: 1 }),
      variant({ id: "m", size: "M", reference: "", availableQty: 1 }),
    ];
    expect(defaultVariantId(rows)).toBe("so");
  });
});
