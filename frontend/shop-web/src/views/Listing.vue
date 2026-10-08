<script setup lang="ts">
import type { Locale, StyleListItem } from "@pocochic/contracts";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStyles } from "../catalog";
import ArcadeKey from "../components/ArcadeKey.vue";
import ProductCard from "../components/ProductCard.vue";
import { t } from "../i18n";
import { pageWindow } from "../paging";
import { useCartStore } from "../stores/cart";

const PAGE_SIZE = 12;
const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const { items, state, load } = useStyles();
const locale = computed(() => route.params.locale as Locale);
const queryText = computed(() => String(route.query.q ?? ""));
const draft = ref(queryText.value);

watch(queryText, (value) => {
  draft.value = value;
});

const filtered = computed(() => {
  const needle = queryText.value.trim().toLowerCase();
  if (!needle) return items.value;
  return items.value.filter((item) => item.displayName.toLowerCase().includes(needle));
});

const paged = computed(() => pageWindow(filtered.value, Number(route.query.page ?? 1), PAGE_SIZE));

function writeQuery(q: string, pageNumber: number) {
  const query: Record<string, string> = {};
  const trimmed = q.trim();
  if (trimmed) query.q = trimmed;
  if (pageNumber > 1) query.page = String(pageNumber);
  router.replace({ query });
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  draft.value = value;
  writeQuery(value, 1);
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

watch(paged, (value) => {
  if (state.value !== "ready") return;
  const requested = Number(route.query.page ?? 1) || 1;
  if (requested !== value.current) writeQuery(queryText.value, value.current);
});

onMounted(load);
</script>

<template>
  <section class="mx-auto w-full max-w-7xl px-5 py-12">
    <p class="font-heading text-xs font-bold uppercase text-primary">{{ t(locale, "arcadeKicker") }}</p>
    <h1 class="mt-2 text-balance font-heading text-4xl font-bold">{{ t(locale, "allProducts") }}</h1>
    <p class="mt-2 text-pretty text-muted-foreground">{{ t(locale, "allProductsBody") }}</p>
    <div class="mt-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <ArcadeKey variant="choice" chip state="on" class="w-fit shrink-0" @click="writeQuery('', 1)">
        {{ t(locale, "allItems") }}
      </ArcadeKey>
      <label class="flex min-h-11 w-full items-center gap-3 rounded-lg border-2 border-border bg-card px-4 shadow-md sm:w-80">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-primary" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          id="catalog-search"
          :value="draft"
          type="search"
          :aria-label="t(locale, 'searchLabel')"
          :placeholder="t(locale, 'searchPlaceholder')"
          class="w-full min-w-0 bg-transparent font-sans text-sm text-foreground outline-none placeholder:text-muted-foreground"
          @input="onInput"
        />
      </label>
    </div>
    <p v-if="state === 'loading'" class="mt-10 font-heading">{{ t(locale, "loading") }}</p>
    <div v-else-if="state === 'error'" class="mt-10">
      <p class="font-heading">{{ t(locale, "error") }}</p>
      <ArcadeKey class="mt-4" @click="load">{{ t(locale, "retry") }}</ArcadeKey>
    </div>
    <template v-else>
      <p v-if="filtered.length === 0" class="mt-10 font-heading">{{ t(locale, "noResults") }}</p>
      <div v-else class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard v-for="item in paged.slice" :key="item.slug" :item="item" :locale="locale" @add="add" />
      </div>
      <nav v-if="paged.pages > 1" class="mt-9 flex items-center justify-center gap-2" :aria-label="t(locale, 'pagination')">
        <ArcadeKey
          variant="choice"
          square
          :aria-label="t(locale, 'previous')"
          :disabled="paged.current <= 1"
          @click="writeQuery(queryText, paged.current - 1)"
        >
          <span class="page-prev" aria-hidden="true">&lt;</span>
        </ArcadeKey>
        <ArcadeKey variant="choice" square state="on" aria-current="page">{{ paged.current }}</ArcadeKey>
        <ArcadeKey
          v-if="paged.current < paged.pages"
          variant="choice"
          square
          state="off"
          @click="writeQuery(queryText, paged.current + 1)"
        >
          {{ paged.current + 1 }}
        </ArcadeKey>
        <ArcadeKey
          variant="choice"
          square
          :aria-label="t(locale, 'next')"
          :disabled="paged.current >= paged.pages"
          @click="writeQuery(queryText, paged.current + 1)"
        >
          <span class="page-next" aria-hidden="true">&gt;</span>
        </ArcadeKey>
      </nav>
    </template>
  </section>
</template>
