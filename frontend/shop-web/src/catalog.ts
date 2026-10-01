import { styleListItemSchema, type StyleListItem } from "@pocochic/contracts";
import { ref } from "vue";
import { api } from "./api";

export function useStyles() {
  const items = ref<StyleListItem[]>([]);
  const state = ref<"loading" | "ready" | "error">("loading");

  async function load() {
    state.value = "loading";
    try {
      const res = await api.styles.$get();
      if (!res.ok) {
        state.value = "error";
        return;
      }
      const parsed = styleListItemSchema.array().safeParse(await res.json());
      if (!parsed.success) {
        state.value = "error";
        return;
      }
      items.value = parsed.data;
      state.value = "ready";
    } catch {
      state.value = "error";
    }
  }

  return { items, state, load };
}
