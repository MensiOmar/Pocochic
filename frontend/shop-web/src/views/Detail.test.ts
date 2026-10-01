import type { StyleDetail } from "@pocochic/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import { api } from "../api";
import { useCartStore } from "../stores/cart";
import Detail from "./Detail.vue";

vi.mock("../api", () => ({
  catalogSrc: (imagePath: string | null) => imagePath,
  api: { styles: { ":slug": { $get: vi.fn() } } },
}));

function response(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

const hoodie: StyleDetail = {
  slug: "hello-hoodie",
  itemCode: "Hello Hoodie",
  displayName: "Hello Hoodie",
  imagePath: "/catalog/styles/hello-hoodie.webp",
  priceCents: 6000,
  priceVaries: true,
  isAvailable: true,
  isSoldOut: false,
  sizes: ["S", "M", "L Oversize"],
  inStockVariantCount: 2,
  soleVariant: null,
  description: "Soft fleece",
  variants: [
    { id: "hh-l", size: "L Oversize", reference: "", priceCents: 7000, availableQty: 0 },
    { id: "hh-m", size: "M", reference: "", priceCents: 6200, availableQty: 1 },
    { id: "hh-s", size: "S", reference: "", priceCents: 6000, availableQty: 1 },
  ],
};

const sold: StyleDetail = {
  slug: "sold-tee",
  itemCode: "Sold Tee",
  displayName: "Sold Tee",
  imagePath: "/catalog/styles/sold-tee.webp",
  priceCents: 4500,
  priceVaries: true,
  isAvailable: false,
  isSoldOut: true,
  sizes: ["S", "M"],
  inStockVariantCount: 0,
  soleVariant: null,
  description: null,
  variants: [
    { id: "st-s", size: "S", reference: "", priceCents: 5000, availableQty: 0 },
    { id: "st-m", size: "M", reference: "", priceCents: 4500, availableQty: 0 },
  ],
};

const shade: StyleDetail = {
  slug: "friends-trip",
  itemCode: "SHEGLAM Hello Kitty - Cream Blush",
  displayName: "Friends Trip",
  imagePath: null,
  priceCents: 3900,
  priceVaries: false,
  isAvailable: true,
  isSoldOut: false,
  sizes: [],
  inStockVariantCount: 1,
  soleVariant: { id: "ft", size: "", reference: "Friends Trip", priceCents: 3900, availableQty: 1 },
  description: null,
  variants: [{ id: "ft", size: "", reference: "Friends Trip", priceCents: 3900, availableQty: 1 }],
};

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/:locale/p/:slug", name: "detail", component: Detail },
    { path: "/:locale/shop", name: "shop", component: { template: "<div />" } },
  ],
});

describe("Detail", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  async function open(slug: string, body: unknown, status = 200) {
    vi.mocked(api.styles[":slug"].$get).mockResolvedValue(response(body, status) as never);
    await router.push(`/en/p/${slug}`);
    await router.isReady();
    const wrapper = mount(Detail, { global: { plugins: [router, createPinia()] } });
    await flushPromises();
    return wrapper;
  }

  it("follows the selected size price and stops at the available quantity", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.mocked(api.styles[":slug"].$get).mockResolvedValue(response(hoodie) as never);
    await router.push("/en/p/hello-hoodie");
    await router.isReady();
    const wrapper = mount(Detail, { global: { plugins: [router, pinia] } });
    await flushPromises();

    expect(wrapper.text()).toContain("Soft fleece");
    expect(wrapper.text()).toContain("Pick your size");
    expect(wrapper.text()).toContain("60 DT");
    expect(wrapper.text()).not.toContain("62 DT");
    expect(wrapper.get("button[aria-pressed=true]").text()).toBe("S");
    const oversize = wrapper.findAll("button").find((button) => button.text() === "L Oversize");
    expect(oversize?.attributes("disabled")).toBeDefined();
    await oversize?.trigger("click");
    expect(wrapper.text()).not.toContain("62 DT");

    await wrapper.findAll("button").find((button) => button.text() === "M")?.trigger("click");
    expect(wrapper.get("button[aria-pressed=true]").text()).toBe("M");
    expect(wrapper.text()).toContain("62 DT");
    expect(wrapper.text()).not.toContain("70 DT");

    await wrapper.get("button.w-full").trigger("click");
    expect(useCartStore().count).toBe(1);
    expect(useCartStore().lines[0]?.unitPriceCents).toBe(6200);
    await wrapper.get("button.w-full").trigger("click");
    expect(wrapper.text()).toContain("That's all we have of this one.");
    expect(useCartStore().count).toBe(1);
  });

  it("shows a sold-out style at the lowest price with no add button", async () => {
    const wrapper = await open("sold-tee", sold);
    expect(wrapper.get("img").classes()).toContain("grayscale");
    expect(wrapper.findAll("button").find((button) => button.text() === "S")?.classes()).toContain("opacity-60");
    expect(wrapper.text()).toContain("45 DT");
    expect(wrapper.text()).not.toContain("50 DT");
    expect(wrapper.text()).toContain("Unavailable");
    expect(wrapper.find("button.w-full").exists()).toBe(false);
    expect(wrapper.findAll("button").every((button) => button.attributes("disabled") !== undefined || button.text() === "Retry")).toBe(true);
  });

  it("shows the parent code for a shade and skips the option row", async () => {
    const wrapper = await open("friends-trip", shade);
    expect(wrapper.text()).toContain("SHEGLAM Hello Kitty - Cream Blush");
    expect(wrapper.text()).toContain("Friends Trip");
    expect(wrapper.text()).not.toContain("Pick your size");
    expect(wrapper.text()).not.toContain("Pick one");
    expect(wrapper.text()).toContain("Product image");
    await wrapper.get("button.w-full").trigger("click");
    expect(wrapper.text()).toContain("Add to cart");
  });

  it("shows an error when the product request fails", async () => {
    vi.mocked(api.styles[":slug"].$get).mockRejectedValue(new Error("down"));
    await router.push("/en/p/hello-hoodie");
    await router.isReady();
    const wrapper = mount(Detail, { global: { plugins: [router, createPinia()] } });
    await flushPromises();
    expect(wrapper.text()).toContain("Couldn't load. Please retry.");
  });

  it("explains a missing style", async () => {
    const wrapper = await open("missing", { error: { code: "not_found", message: "Style not found" } }, 404);
    expect(wrapper.text()).toContain("This piece isn't in the shop.");
    expect(wrapper.get("a").attributes("href")).toBe("/en/shop");
  });
});
