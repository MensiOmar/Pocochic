import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import ProductCard from "./ProductCard.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/:locale/p/:slug", component: { template: "<div />" } }],
});

const base = {
  slug: "tee",
  itemCode: "TEE",
  displayName: "Cassette Tee",
  imagePath: "/catalog/styles/tee.webp",
  priceCents: 4500,
  priceVaries: false,
  isAvailable: true,
  isSoldOut: false,
  sizes: ["S", "M"],
  inStockVariantCount: 2,
  soleVariant: null,
};

describe("ProductCard", () => {
  it("hides + when several sizes are in stock and keeps the sold-out card readable", async () => {
    const many = mount(ProductCard, {
      global: { plugins: [router] },
      props: { locale: "en", item: base },
    });
    expect(many.find("button").exists()).toBe(false);
    expect(many.text()).toContain("S–M");
    expect(many.text()).toContain("45 DT");

    const sold = mount(ProductCard, {
      global: { plugins: [router] },
      props: {
        locale: "en",
        item: { ...base, displayName: "Gone Pin", isAvailable: false, isSoldOut: true, sizes: ["U"], inStockVariantCount: 0 },
      },
    });
    expect(sold.find("button").exists()).toBe(false);
    expect(sold.text()).toContain("Out of stock");
    expect(sold.text()).toContain("Unavailable");
    expect(sold.get("a").attributes("href")).toBe("/en/p/tee");
  });

  it("shows + only for a single in-stock variant", () => {
    const wrapper = mount(ProductCard, {
      global: { plugins: [router] },
      props: {
        locale: "en",
        item: {
          ...base,
          sizes: ["S"],
          inStockVariantCount: 1,
          soleVariant: { id: "var-a", size: "S", reference: "", priceCents: 4500, availableQty: 2 },
        },
      },
    });
    expect(wrapper.get("button").text()).toBe("+");
    expect(wrapper.get("button").classes()).toContain("px-icon");
  });
});
