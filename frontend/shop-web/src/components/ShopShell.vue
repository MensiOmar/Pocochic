<script setup lang="ts">
import { LOCALES, type Locale } from "@pocochic/contracts";
import cartEmpty from "@assets/cart-empty.svg";
import cartFilled from "@assets/cart-filled.svg";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "../i18n";
import { useCartStore } from "../stores/cart";
import { brandAssets, themeMode } from "../theme";
import ArcadeKey from "./ArcadeKey.vue";

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const locale = computed(() => (route.params.locale as Locale) || "fr");
const brand = brandAssets[themeMode];

const links = computed(() => [
  { name: "home", label: t(locale.value, "home"), to: `/${locale.value}` },
  { name: "shop", label: t(locale.value, "shopAll"), to: `/${locale.value}/shop` },
]);

function switchLocale(next: Locale) {
  if (next === locale.value) return;
  router.push({
    name: typeof route.name === "string" ? route.name : "home",
    params: { ...route.params, locale: next },
    query: route.query,
  });
}
</script>

<template>
  <div class="flex min-h-screen w-full flex-col bg-background">
    <header class="relative z-20 border-b-2 border-border bg-card">
      <div v-if="route.name === 'cart'" class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <ArcadeKey variant="back" class="min-w-0" :to="`/${locale}`">{{ t(locale, "keepBrowsing") }}</ArcadeKey>
        <img :src="brand.logo" alt="Pocochic" class="h-10 w-auto shrink-0 object-contain" />
        <span class="shrink-0 font-heading text-xs font-bold uppercase sm:text-sm">{{ t(locale, "yourCart") }} ({{ cart.count }})</span>
      </div>
      <div v-else-if="route.name === 'checkout'" class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <ArcadeKey variant="back" class="min-w-0" :to="`/${locale}/cart`">{{ t(locale, "backToBag") }}</ArcadeKey>
        <img :src="brand.logo" alt="Pocochic" class="h-10 w-auto shrink-0 object-contain" />
        <span class="shrink-0 font-heading text-xs font-bold uppercase sm:text-sm">{{ t(locale, "checkoutBar") }}</span>
      </div>
      <div v-else class="mx-auto grid w-full max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-4">
        <RouterLink :to="`/${locale}`" class="justify-self-start">
          <img :src="brand.logo" alt="Pocochic" class="h-11 w-auto object-contain" />
        </RouterLink>
        <nav class="hidden items-center justify-center gap-7 font-heading text-sm font-bold uppercase lg:flex" :aria-label="t(locale, 'shopAll')">
          <RouterLink
            v-for="link in links"
            :key="link.name"
            :to="link.to"
            :class="route.name === link.name ? 'text-primary' : ''"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
        <div class="flex items-center justify-self-end gap-4">
          <div class="flex items-center gap-2 font-heading text-sm font-bold uppercase" role="group" :aria-label="t(locale, 'language')">
            <button
              v-for="code in LOCALES"
              :key="code"
              type="button"
              class="min-h-11 px-1"
              :class="code === locale ? 'text-primary' : ''"
              :aria-pressed="code === locale"
              @click="switchLocale(code)"
            >
              {{ code }}
            </button>
          </div>
          <ArcadeKey variant="icon" :to="`/${locale}/cart`" :aria-label="t(locale, 'cart')" :badge="cart.count">
            <img class="cart-ico" alt="" :src="cart.count > 0 ? cartFilled : cartEmpty" />
          </ArcadeKey>
        </div>
      </div>
      <nav v-if="route.name !== 'cart' && route.name !== 'checkout'" class="mx-auto flex w-full max-w-7xl items-center justify-center gap-7 px-5 pb-4 font-heading text-sm font-bold uppercase lg:hidden">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="link.to"
          :class="route.name === link.name ? 'text-primary' : ''"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
    </header>
    <main class="relative flex flex-1 flex-col overflow-hidden">
      <img :src="brand.background" alt="" class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-50" />
      <div class="relative z-10 flex flex-1 flex-col">
        <slot />
      </div>
    </main>
  </div>
</template>
