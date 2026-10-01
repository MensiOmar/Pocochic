import { createRouter, createWebHistory } from "vue-router";
import { applyLocale, isLocale, readLocale } from "./i18n";
import CartView from "./views/Cart.vue";
import CheckoutView from "./views/Checkout.vue";
import ConfirmationView from "./views/Confirmation.vue";
import DetailView from "./views/Detail.vue";
import HomeView from "./views/Home.vue";
import ListingView from "./views/Listing.vue";

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0 };
  },
  routes: [
    { path: "/", redirect: () => `/${readLocale()}` },
    { path: "/:locale", name: "home", component: HomeView },
    { path: "/:locale/shop", name: "shop", component: ListingView },
    { path: "/:locale/p/:slug", name: "detail", component: DetailView },
    { path: "/:locale/cart", name: "cart", component: CartView },
    { path: "/:locale/checkout", name: "checkout", component: CheckoutView },
    { path: "/:locale/confirmation", name: "confirmation", component: ConfirmationView },
  ],
});

router.beforeEach((to) => {
  const locale = String(to.params.locale ?? "");
  if (!locale) return true;
  if (!isLocale(locale)) return `/${readLocale()}`;
  applyLocale(locale);
  return true;
});
