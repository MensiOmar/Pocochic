import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { useCheckoutDraftStore } from "./checkout-draft";

describe("checkout draft", () => {
  beforeEach(() => {
    sessionStorage.clear();
    setActivePinia(createPinia());
  });

  it("keeps one checkout key across a reload and rotates when the order changes", () => {
    const draft = useCheckoutDraftStore();
    const key = draft.keyFor("same-order");

    setActivePinia(createPinia());
    const restored = useCheckoutDraftStore();
    expect(restored.keyFor("same-order")).toBe(key);
    expect(restored.keyFor("edited-order")).not.toBe(key);

    restored.clear();
    setActivePinia(createPinia());
    expect(useCheckoutDraftStore().keyFor("same-order")).not.toBe(key);
  });
});
