import { CART_STORAGE_KEY, type PromoQuote } from "@pocochic/contracts";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import type { RefreshPlan } from "../cart-sync";
import { useCartStore } from "./cart";

const line = {
  variantId: "var-a",
  quantity: 1,
  slug: "tee-1",
  itemCode: "TEE-1",
  displayName: "Tee",
  size: "S",
  reference: "",
  unitPriceCents: 4500,
  imagePath: null,
  availableQty: 2,
};

const quote: PromoQuote = {
  code: "FIVE",
  type: "discount",
  discountCents: 500,
  itemsCents: 4500,
  deliveryCents: 800,
  totalCents: 4800,
};

describe("cart", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("caps quantity at available stock and survives a reload", () => {
    const cart = useCartStore();
    expect(cart.add(line)).toBe(true);
    const firstNotice = cart.notice?.id;
    expect(cart.add(line)).toBe(true);
    expect(cart.notice?.id).not.toBe(firstNotice);
    const shown = cart.notice?.id;
    expect(cart.add(line)).toBe(false);
    expect(cart.lines[0].quantity).toBe(2);
    expect(cart.notice).toMatchObject({ displayName: "Tee", size: "S", unitPriceCents: 4500, imagePath: null });
    expect(cart.notice?.id).toBe(shown);
    expect(cart.add({ ...line, availableQty: 5 })).toBe(false);
    expect(cart.lines[0].availableQty).toBe(2);
    expect(cart.itemsCents).toBe(9000);
    expect(cart.deliveryCents).toBe(800);
    expect(cart.totalCents).toBe(9800);
    setActivePinia(createPinia());
    const reloaded = useCartStore();
    expect(reloaded.notice).toBeNull();
    const saved = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) ?? "{}") as { lines: unknown[]; promoCode: string };
    expect(saved.lines).toHaveLength(1);
    expect(saved.promoCode).toBe("");
    expect(reloaded.count).toBe(2);
    reloaded.clear();
    expect(reloaded.lines).toHaveLength(0);
    expect(reloaded.deliveryCents).toBe(0);
  });

  it("reads a bag saved before the promo field existed", () => {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify([line]));
    const cart = useCartStore();
    expect(cart.lines).toHaveLength(1);
    expect(cart.promoCode).toBe("");
    expect(cart.count).toBe(1);
  });

  it("keeps a promo code as text and drops the quote when the bag changes", () => {
    const cart = useCartStore();
    cart.add(line);
    cart.commitPromo("FIVE");
    cart.acceptQuote(quote);
    expect(cart.acceptedCode).toBe("FIVE");
    expect(cart.discountCents).toBe(500);
    expect(cart.totalCents).toBe(4800);
    cart.setQty("var-a", 2);
    expect(cart.quote).toBeNull();
    expect(cart.promoCode).toBe("FIVE");
    expect(cart.totalCents).toBe(9800);
    cart.acceptQuote({ ...quote, itemsCents: 9000, totalCents: 9300 });
    cart.remove("var-a");
    expect(cart.quote).toBeNull();
    expect(cart.promoCode).toBe("FIVE");
    cart.clear();
    expect(cart.promoCode).toBe("");
  });

  it("applies a catalog refresh onto the saved lines", () => {
    const cart = useCartStore();
    cart.add({ ...line, quantity: 2, unitPriceCents: 1000, availableQty: 5 });
    cart.add({ ...line, variantId: "gone", quantity: 1, availableQty: 1 });
    const plan: RefreshPlan = {
      patches: [{
        variantId: "var-a",
        availableQty: 1,
        unitPriceCents: 4500,
        displayName: "Cassette Tee",
        itemCode: "TEE-1",
        size: "S",
        reference: "Cream",
        imagePath: "/catalog/styles/tee-1.webp",
      }],
      removeIds: ["gone"],
      complete: true,
      priceChanged: true,
      qtyLowered: true,
      removed: true,
    };
    cart.acceptQuote(quote);
    cart.applyRefresh(plan);
    expect(cart.quote).toBeNull();
    expect(cart.lines).toHaveLength(1);
    expect(cart.lines[0]).toMatchObject({ quantity: 1, unitPriceCents: 4500, displayName: "Cassette Tee", reference: "Cream" });
    expect(cart.itemsCents).toBe(4500);
  });
});
