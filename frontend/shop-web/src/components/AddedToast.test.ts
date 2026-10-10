import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter } from "vue-router";
import { useCartStore } from "../stores/cart";
import AddedToast from "./AddedToast.vue";

const line = {
  variantId: "var-a",
  quantity: 1,
  slug: "tee-1",
  itemCode: "TEE-1",
  displayName: "Hello Kitty hoodie",
  size: "XXL",
  reference: "",
  unitPriceCents: 6000,
  imagePath: null,
  availableQty: 2,
};

describe("added toast", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("shows the ticket after a successful add and keeps it on a failed one", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/:locale/cart", name: "cart", component: { template: "<div />" } }],
    });
    await router.push("/en/cart");
    const wrapper = mount(AddedToast, { global: { plugins: [router] } });
    const cart = useCartStore();

    expect(wrapper.find(".added-toast").exists()).toBe(false);
    expect(cart.add(line)).toBe(true);
    await flushPromises();
    expect(wrapper.get(".added-kicker").text()).toBe("Added");
    expect(wrapper.get(".added-name").text()).toBe("Hello Kitty hoodie");
    expect(wrapper.get(".added-variant").text()).toBe("XXL");
    expect(wrapper.get(".added-price").text()).toContain("60 DT");
    expect(wrapper.findAll(".added-life i")).toHaveLength(8);
    expect(wrapper.get(".added-cart").attributes("href")).toBe("/en/cart");

    const shown = cart.notice?.id;
    expect(cart.add(line)).toBe(true);
    await flushPromises();
    expect(cart.notice?.id).not.toBe(shown);
    expect(wrapper.get(".added-name").text()).toBe("Hello Kitty hoodie");

    expect(cart.add(line)).toBe(false);
    await flushPromises();
    expect(cart.notice?.id).not.toBe(shown);
    expect(wrapper.find(".added-toast").exists()).toBe(true);
  });
});
