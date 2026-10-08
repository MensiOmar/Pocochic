<script setup lang="ts">
import type { Locale, StyleListItem } from "@pocochic/contracts";
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { catalogSrc } from "../api";
import { useStyles } from "../catalog";
import ArcadeKey from "../components/ArcadeKey.vue";
import PriceTag from "../components/PriceTag.vue";
import ProductCard from "../components/ProductCard.vue";
import { t } from "../i18n";
import { sizeRange } from "../sizes";
import { useCartStore } from "../stores/cart";

const route = useRoute();
const cart = useCartStore();
const { items, state, load } = useStyles();
const locale = computed(() => route.params.locale as Locale);
const hero = ref<StyleListItem | null>(null);
const pickups = ref<StyleListItem[]>([]);

function deal(list: StyleListItem[]) {
  const pool = list.filter((item) => item.isAvailable && item.imagePath);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = pool[index];
    pool[index] = pool[swap] as StyleListItem;
    pool[swap] = current as StyleListItem;
  }
  hero.value = pool[0] ?? null;
  pickups.value = pool.slice(1, 4);
}

function add(item: StyleListItem) {
  const sole = item.soleVariant;
  if (!sole) return;
  cart.add({
    variantId: sole.id,
    quantity: 1,
    slug: item.slug,
    itemCode: item.itemCode,
    displayName: item.displayName,
    size: sole.size,
    reference: sole.reference,
    unitPriceCents: sole.priceCents,
    imagePath: item.imagePath,
    availableQty: sole.availableQty,
  });
}

async function retry() {
  await load();
  if (state.value === "ready") deal(items.value);
}

onMounted(retry);

const heroRange = computed(() => sizeRange(hero.value?.sizes ?? []));
const heroSrc = computed(() => catalogSrc(hero.value?.imagePath ?? null));
</script>

<template>
  <section v-if="state === 'loading'" class="mx-auto max-w-7xl px-5 py-16 font-heading">{{ t(locale, "loading") }}</section>
  <section v-else-if="state === 'error'" class="mx-auto max-w-7xl px-5 py-16">
    <p class="font-heading">{{ t(locale, "error") }}</p>
    <ArcadeKey class="mt-4" @click="retry">{{ t(locale, "retry") }}</ArcadeKey>
  </section>
  <template v-else>
    <section>
      <div class="mx-auto grid max-w-7xl grid-cols-1 items-center gap-8 px-5 py-12 lg:grid-cols-2 lg:py-16">
        <div>
          <p class="mb-4 inline-flex rounded-lg border-2 border-border bg-accent px-3 py-1 font-heading text-xs font-bold uppercase">{{ t(locale, "heroKicker") }}</p>
          <h1 class="max-w-xl text-balance font-heading text-4xl font-bold leading-tight md:text-6xl">{{ t(locale, "heroTitle") }}</h1>
          <p class="mt-5 max-w-lg text-pretty text-lg text-muted-foreground">{{ t(locale, "heroBody") }}</p>
          <ArcadeKey hero class="mt-8" :to="`/${locale}/shop`">{{ t(locale, "shopNow") }}</ArcadeKey>
        </div>
        <div v-if="hero" class="relative mx-auto w-full max-w-lg">
          <div class="absolute inset-4 rounded-xl border-2 border-border bg-accent"></div>
          <div class="relative overflow-hidden rounded-xl border-2 border-border bg-card p-5 shadow-md">
            <div class="flex items-center justify-between border-b-2 border-border pb-3 font-heading text-xs font-bold uppercase">
              <span>{{ t(locale, "player") }}</span>
              <span class="rounded-lg border-2 border-border bg-primary px-2 py-1">{{ t(locale, "newDrop") }}</span>
            </div>
            <RouterLink :to="`/${locale}/p/${hero.slug}`" class="grid h-72 place-items-center overflow-hidden border-b-2 border-border bg-muted">
              <img v-if="heroSrc" :src="heroSrc" :alt="hero.displayName" class="h-full w-full object-contain p-4" />
            </RouterLink>
            <div class="flex items-end justify-between gap-3 pt-4">
              <div>
                <p v-if="heroRange" class="font-heading text-xs text-tertiary">{{ heroRange }}</p>
                <h2 class="mt-1 font-heading text-2xl font-bold">{{ hero.displayName }}</h2>
              </div>
              <PriceTag :cents="hero.priceCents" large />
            </div>
          </div>
        </div>
      </div>
    </section>
    <section v-if="pickups.length" class="mx-auto w-full max-w-7xl px-5 py-14">
      <div class="mb-7 flex items-end justify-between gap-4">
        <div>
          <p class="font-heading text-xs font-bold uppercase text-primary">{{ t(locale, "featuredKicker") }}</p>
          <h2 class="mt-2 text-balance font-heading text-2xl font-bold">{{ t(locale, "featuredTitle") }}</h2>
        </div>
        <ArcadeKey variant="text" :to="`/${locale}/shop`">{{ t(locale, "viewAll") }}</ArcadeKey>
      </div>
      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard v-for="item in pickups" :key="item.slug" :item="item" :locale="locale" @add="add" />
      </div>
    </section>
  </template>
</template>
