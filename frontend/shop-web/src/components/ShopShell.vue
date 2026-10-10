<script setup lang="ts">
import { LOCALES, type Locale } from "@pocochic/contracts";
import cartEmpty from "@assets/cart-empty.svg";
import cartFilled from "@assets/cart-filled.svg";
import cloudsFarDark from "@assets/clouds-far-dark.png";
import cloudsFarLight from "@assets/clouds-far-light.png";
import cloudsNearDark from "@assets/clouds-near-dark.png";
import cloudsNearLight from "@assets/clouds-near-light.png";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { t } from "../i18n";
import "../player-nav.css";
import { useCartStore } from "../stores/cart";
import { brandAssets, themeMode, toggleTheme } from "../theme";
import AddedToast from "./AddedToast.vue";
import ArcadeKey from "./ArcadeKey.vue";
import FlagMark from "./FlagMark.vue";
import PlayerSprite from "./PlayerSprite.vue";

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const locale = computed(() => (route.params.locale as Locale) || "fr");
const brand = computed(() => brandAssets[themeMode.value]);
const langOpen = ref(false);
const langRoot = ref<HTMLElement | null>(null);

const links = computed(() => [
  { name: "home", label: t(locale.value, "home"), to: `/${locale.value}` },
  { name: "shop", label: t(locale.value, "shopAll"), to: `/${locale.value}/shop` },
]);

const languages = computed(() => [
  { code: "fr" as const, label: t(locale.value, "langFr") },
  { code: "ar" as const, label: t(locale.value, "langAr") },
  { code: "en" as const, label: t(locale.value, "langEn") },
]);

function switchLocale(next: Locale) {
  langOpen.value = false;
  if (next === locale.value) return;
  router.push({
    name: typeof route.name === "string" ? route.name : "home",
    params: { ...route.params, locale: next },
    query: route.query,
  });
}

function onDocumentClick(event: MouseEvent) {
  if (!langRoot.value?.contains(event.target as Node)) langOpen.value = false;
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") langOpen.value = false;
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<template>
  <div class="relative flex min-h-screen w-full flex-col bg-background">
    <PlayerSprite />
    <img
      :src="brand.background"
      alt=""
      class="pointer-events-none absolute inset-0 h-full w-full object-cover"
      :class="themeMode === 'dark' ? 'opacity-100' : 'opacity-50'"
    />
    <div class="sky sky-far for-light" aria-hidden="true">
      <div class="sky-track">
        <img :src="cloudsFarLight" alt="" />
        <img :src="cloudsFarLight" alt="" />
      </div>
    </div>
    <div class="sky sky-far for-dark" aria-hidden="true">
      <div class="sky-track">
        <img :src="cloudsFarDark" alt="" />
        <img :src="cloudsFarDark" alt="" />
      </div>
    </div>
    <div class="sky sky-near for-light" aria-hidden="true">
      <div class="sky-track">
        <img :src="cloudsNearLight" alt="" />
        <img :src="cloudsNearLight" alt="" />
      </div>
    </div>
    <div class="sky sky-near for-dark" aria-hidden="true">
      <div class="sky-track">
        <img :src="cloudsNearDark" alt="" />
        <img :src="cloudsNearDark" alt="" />
      </div>
    </div>
    <header v-if="route.name === 'cart'" class="relative z-20 border-b-2 border-border bg-card">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <ArcadeKey variant="back" class="min-w-0" :to="`/${locale}`">{{ t(locale, "keepBrowsing") }}</ArcadeKey>
        <img :src="brand.logo" alt="Pocochic" class="h-10 w-auto shrink-0 object-contain" />
        <span class="shrink-0 font-heading text-xs font-bold uppercase sm:text-sm">{{ t(locale, "yourCart") }} ({{ cart.count }})</span>
      </div>
    </header>
    <header v-else-if="route.name === 'checkout'" class="relative z-20 border-b-2 border-border bg-card">
      <div class="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-4">
        <ArcadeKey variant="back" class="min-w-0" :to="`/${locale}/cart`">{{ t(locale, "backToBag") }}</ArcadeKey>
        <img :src="brand.logo" alt="Pocochic" class="h-10 w-auto shrink-0 object-contain" />
        <span class="shrink-0 font-heading text-xs font-bold uppercase sm:text-sm">{{ t(locale, "checkoutBar") }}</span>
      </div>
    </header>
    <header v-else class="relative z-20 pt-6">
      <div class="player-bar" :data-lang="locale">
        <div class="player-row">
          <RouterLink :to="`/${locale}`" class="player-logo" aria-label="Pocochic">
            <img :src="brand.logo" alt="" />
          </RouterLink>
          <nav class="player-links player-links-desk" :aria-label="t(locale, 'shopNav')">
            <RouterLink
              v-for="link in links"
              :key="link.name"
              :to="link.to"
              class="player-link"
              :class="{ 'is-current': route.name === link.name }"
              :aria-current="route.name === link.name ? 'page' : undefined"
            >
              {{ link.label }}
            </RouterLink>
          </nav>
          <div class="player-tools">
            <button
              type="button"
              class="player-slide"
              :aria-pressed="themeMode === 'dark'"
              :aria-label="themeMode === 'dark' ? t(locale, 'themeDark') : t(locale, 'themeLight')"
              @click="toggleTheme()"
            >
              <span class="player-slide-icons" aria-hidden="true">
                <svg class="player-ico player-track-ico"><use href="#i-sun" /></svg>
                <svg class="player-ico player-track-ico"><use href="#i-moon" /></svg>
              </span>
              <span class="player-thumb">
                <svg class="player-ico sun" aria-hidden="true"><use href="#i-sun" /></svg>
                <svg class="player-ico moon" aria-hidden="true"><use href="#i-moon" /></svg>
              </span>
            </button>
            <div ref="langRoot" class="player-lang">
              <button
                type="button"
                class="px"
                :aria-expanded="langOpen"
                aria-haspopup="menu"
                :aria-label="t(locale, 'language')"
                @click.stop="langOpen = !langOpen"
              >
                <span class="face player-flag-face">
                  <span v-for="code in LOCALES" :key="code" class="player-flag-frame" :class="`for-${code}`">
                    <FlagMark :code="code" />
                  </span>
                  <svg class="player-chev" aria-hidden="true"><use href="#i-chev" /></svg>
                </span>
              </button>
              <div v-if="langOpen" class="player-menu" role="menu" :aria-label="t(locale, 'language')">
                <button
                  v-for="item in languages"
                  :key="item.code"
                  type="button"
                  role="menuitemradio"
                  :aria-checked="item.code === locale"
                  @click="switchLocale(item.code)"
                >
                  <span class="player-cursor" aria-hidden="true"><svg class="player-arrow"><use href="#i-arrow" /></svg></span>
                  <span class="player-flag-frame"><FlagMark :code="item.code" /></span>
                  <span :class="{ 'name-ar': item.code === 'ar' }">{{ item.label }}</span>
                </button>
              </div>
            </div>
            <ArcadeKey variant="icon" :to="`/${locale}/cart`" :aria-label="t(locale, 'cart')" :badge="cart.count">
              <img class="cart-ico" alt="" :src="cart.count > 0 ? cartFilled : cartEmpty" />
            </ArcadeKey>
          </div>
        </div>
        <nav class="player-links player-links-phone" :aria-label="t(locale, 'shopNav')">
          <RouterLink
            v-for="link in links"
            :key="link.name"
            :to="link.to"
            class="player-link"
            :class="{ 'is-current': route.name === link.name }"
            :aria-current="route.name === link.name ? 'page' : undefined"
          >
            {{ link.label }}
          </RouterLink>
        </nav>
      </div>
    </header>
    <main class="relative z-10 flex flex-1 flex-col">
      <div class="relative flex flex-1 flex-col">
        <slot />
      </div>
    </main>
    <AddedToast />
  </div>
</template>

<style>
/* Direction stays physical so Arabic rtl does not reverse the loop. */
.sky {
  position: fixed;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
  direction: ltr;
}
.sky-track {
  display: flex;
  width: max-content;
  height: 100%;
  animation: cloud-drift linear infinite;
  will-change: transform;
}
.sky-track img {
  height: 100%;
  width: auto;
  max-width: none; /* Tailwind preflight would otherwise cap each strip */
  display: block;
  image-rendering: pixelated;
}
.sky-far .sky-track { animation-duration: 150s; animation-delay: -55s; }
.sky-near .sky-track { animation-duration: 86s; }
.sky.for-dark { display: none; }
[data-theme="dark"] .sky.for-light { display: none; }
[data-theme="dark"] .sky.for-dark { display: block; }
.sky-near { opacity: 0.40; }
.sky-far { opacity: 0.18; }
[data-theme="dark"] .sky-near { opacity: 0.50; }
[data-theme="dark"] .sky-far { opacity: 0.22; }
@keyframes cloud-drift {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@media (prefers-reduced-motion: reduce) {
  .sky-track { animation: none; }
}
</style>
