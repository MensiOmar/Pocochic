import { styleListItemSchema, type StyleListItem } from "@pocochic/contracts";
import { ref } from "vue";
import { api } from "./api";

export function useStyles() {
  const items = ref<StyleListItem[]>([]);
  const state = ref<"loading" | "ready" | "error">("loading");

  async function load() {
    state.value = "loading";
    const res = await api.styles.$get();
    if (!res.ok) {
      state.value = "error";
      return;
    }
    items.value = styleListItemSchema.array().parse(await res.json());
    state.value = "ready";
  }

  return { items, state, load };
}
