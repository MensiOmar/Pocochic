import type { StoredCartLine, StyleDetail } from "@pocochic/contracts";
import { describe, expect, it } from "vitest";
import { lineMeta, planRefresh, type StyleLoad } from "./cart-sync";

function line(overrides: Partial<StoredCartLine> = {}): StoredCartLine {
  return {
    variantId: "var-a",
    quantity: 1,
    slug: "tee-1",
    itemCode: "TEE-1",
    displayName: "Old",
    size: "S",
    reference: "",
    unitPriceCents: 1000,
    imagePath: null,
    availableQty: 5,
    ...overrides,
  };
}

function style(overrides: Partial<StyleDetail> = {}): StyleDetail {
  return {
    slug: "tee-1",
    itemCode: "TEE-1",
    displayName: "Cassette Tee",
    imagePath: "/catalog/styles/tee-1.webp",
    priceCents: 4500,
    priceVaries: false,
    isAvailable: true,
    isSoldOut: false,
    sizes: ["S"],
    inStockVariantCount: 1,
    soleVariant: null,
    description: null,
    variants: [{ id: "var-a", size: "S", reference: "Cream", priceCents: 4500, availableQty: 2 }],
    ...overrides,
  };
}

describe("line meta", () => {
  it("skips blank reference and size", () => {
    expect(lineMeta(line())).toBe("#TEE-1 · S");
    expect(lineMeta(line({ reference: "Cream", size: "M" }))).toBe("#TEE-1 · Cream · M");
    expect(lineMeta(line({ size: "" }))).toBe("#TEE-1");
  });
});

describe("planRefresh", () => {
  it("updates a line from the catalog and reports a price change", () => {
    const plan = planRefresh([line()], [{ slug: "tee-1", status: "ok", style: style() }]);
    expect(plan.complete).toBe(true);
    expect(plan.priceChanged).toBe(true);
    expect(plan.qtyLowered).toBe(false);
    expect(plan.removed).toBe(false);
    expect(plan.patches[0]).toMatchObject({
      variantId: "var-a",
      unitPriceCents: 4500,
      availableQty: 2,
      displayName: "Cassette Tee",
      reference: "Cream",
      imagePath: "/catalog/styles/tee-1.webp",
    });
  });

  it("lowers a quantity that no longer fits", () => {
    const plan = planRefresh([line({ quantity: 5 })], [{ slug: "tee-1", status: "ok", style: style() }]);
    expect(plan.qtyLowered).toBe(true);
    expect(plan.patches[0]?.availableQty).toBe(2);
  });

  it("removes a variant the catalog can no longer fill", () => {
    const sold = style({ variants: [{ id: "var-a", size: "S", reference: "", priceCents: 4500, availableQty: 0 }] });
    const plan = planRefresh([line()], [{ slug: "tee-1", status: "ok", style: sold }]);
    expect(plan.removed).toBe(true);
    expect(plan.removeIds).toEqual(["var-a"]);
    expect(plan.complete).toBe(true);
  });

  it("removes every line when the style is gone", () => {
    const plan = planRefresh([line(), line({ variantId: "var-b" })], [{ slug: "tee-1", status: "missing" }]);
    expect(plan.removeIds).toEqual(["var-a", "var-b"]);
    expect(plan.complete).toBe(true);
  });

  it("keeps a saved line when its reload fails", () => {
    const other = line({ variantId: "var-b", slug: "pin", displayName: "Pin" });
    const results: StyleLoad[] = [
      { slug: "tee-1", status: "failed" },
      { slug: "pin", status: "ok", style: style({ slug: "pin", displayName: "Pin", variants: [{ id: "var-b", size: "", reference: "Axe", priceCents: 1500, availableQty: 1 }] }) },
    ];
    const plan = planRefresh([line(), other], results);
    expect(plan.complete).toBe(false);
    expect(plan.patches.map((patch) => patch.variantId)).toEqual(["var-b"]);
    expect(plan.removeIds).toEqual([]);
  });
});
