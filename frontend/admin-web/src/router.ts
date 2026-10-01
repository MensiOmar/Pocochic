import { createRouter, createWebHistory } from "vue-router";
import PlaceholderView from "./views/Placeholder.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/:pathMatch(.*)*", component: PlaceholderView }],
});
