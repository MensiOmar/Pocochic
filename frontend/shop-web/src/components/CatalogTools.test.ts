import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Listing from "../views/Listing.vue";
import PriceRange from "./PriceRange.vue";
import SortMenu from "./SortMenu.vue";

describe("catalog tools", () => {
  it("compiles the listing and opens the sort menu", async () => {
    expect(Listing).toBeTruthy();
    const wrapper = mount(SortMenu, { props: { locale: "en", sort: null } });
    expect(wrapper.get("button").text()).toContain("Sort by");
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("false");
    await wrapper.get("button").trigger("click");
    const options = wrapper.findAll('[role="option"]');
    expect(options.map((option) => option.text())).toEqual(["A-Z", "Z-A", "Cheapest", "Most expensive"]);
    await options[3]!.trigger("click");
    expect(wrapper.emitted("pick")?.[0]).toEqual(["pricey"]);
    expect(wrapper.get("button").attributes("aria-expanded")).toBe("false");
    await wrapper.setProps({ sort: "pricey" });
    expect(wrapper.get("button").classes()).toContain("is-on");
    expect(wrapper.get("button").attributes("aria-pressed")).toBe("true");
    wrapper.unmount();
  });

  it("types one price bound without moving the other", async () => {
    const wrapper = mount(PriceRange, {
      props: { locale: "en", floor: 1, ceil: 67, min: 8, max: 30, lineWidth: 420 },
    });
    const inputs = wrapper.findAll("input");
    await inputs[0]!.setValue("12");
    expect(wrapper.emitted("change")?.at(-1)).toEqual([{ min: 12, max: 30 }]);
    await inputs[1]!.setValue("2");
    expect(wrapper.emitted("change")?.at(-1)).toEqual([{ min: 12, max: 30 }]);
    await inputs[1]!.trigger("blur");
    expect(wrapper.emitted("change")?.at(-1)).toEqual([{ min: 12, max: 12 }]);
    await inputs[0]!.setValue("99");
    expect(wrapper.emitted("change")?.at(-1)).toEqual([{ min: 12, max: 12 }]);
    wrapper.unmount();
  });

  it("rewrites the price boxes while a thumb slides", async () => {
    const wrapper = mount(PriceRange, {
      props: { locale: "en", floor: 1, ceil: 67, min: 8, max: 30, lineWidth: 420 },
    });
    const inputs = wrapper.findAll("input");
    await wrapper.get('[data-side="min"]').trigger("pointerdown", { clientX: 0 });
    expect((inputs[0]!.element as HTMLInputElement).value).toBe("1");
    expect((inputs[1]!.element as HTMLInputElement).value).toBe("30");
    wrapper.unmount();
  });
});
