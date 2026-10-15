<script setup lang="ts">
import type { Locale, StyleListItem } from "@pocochic/contracts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useStyles } from "../catalog";
import { categoryLabel, matchesCatalog, sectionLabel } from "../catalog-filters";
import ArcadeKey from "../components/ArcadeKey.vue";
import CatalogMenus from "../components/CatalogMenus.vue";
import PriceRange from "../components/PriceRange.vue";
import ProductCard from "../components/ProductCard.vue";
import ShopLoader from "../components/ShopLoader.vue";
import SortMenu from "../components/SortMenu.vue";
import { t } from "../i18n";
import {
  dinarDomain,
  listingQuery,
  matchesPrice,
  orderStyles,
  parseSort,
  spanFromQuery,
  type SortId,
  type Span,
} from "../listing-order";
import { pageWindow } from "../paging";
import { useCartStore } from "../stores/cart";
import "../catalog-search.css";

const PAGE_SIZE = 12;
const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const { items, state, load } = useStyles();
const locale = computed(() => route.params.locale as Locale);
const queryText = computed(() => String(route.query.q ?? ""));
const sectionSlug = computed(() => (sectionLabel(String(route.query.section ?? "")) ? String(route.query.section) : ""));
const categorySlug = computed(() => (
  categoryLabel(sectionSlug.value, String(route.query.category ?? "")) ? String(route.query.category) : ""
));
const draft = ref(queryText.value);
const clusterEl = ref<HTMLElement | null>(null);
const sortMenu = ref<{ close: () => void; faceEl: () => HTMLElement | null } | null>(null);
const lineWidth = ref<number | null>(null);

const sort = computed(() => parseSort(route.query.sort));
const domain = computed(() => dinarDomain(items.value.map((item) => item.priceCents)));
const span = computed(() => {
  const bounds = domain.value;
  if (!bounds) return null;
  return spanFromQuery(route.query.min, route.query.max, bounds.floor, bounds.ceil);
});
const priceNarrowed = computed(() => {
  const bounds = domain.value;
  const current = span.value;
  if (!bounds || !current) return false;
  return current.min !== bounds.floor || current.max !== bounds.ceil;
});
const filtersClear = computed(() => (
  !sectionSlug.value && !categorySlug.value && !queryText.value.trim() && !sort.value && !priceNarrowed.value
));

const filtered = computed(() => {
  const current = span.value;
  const matched = items.value.filter((item) => {
    if (!matchesCatalog(item, { section: sectionSlug.value, category: categorySlug.value, q: queryText.value })) return false;
    if (current && !matchesPrice(item.priceCents, current.min, current.max)) return false;
    return true;
  });
  return orderStyles(matched, sort.value, locale.value);
});

const paged = computed(() => pageWindow(filtered.value, Number(route.query.page ?? 1), PAGE_SIZE));

watch(queryText, (value) => {
  draft.value = value;
});

type QueryState = {
  q: string;
  section: string;
  category: string;
  page: number;
  sortId: SortId | null;
  span: Span | null;
};

function readQuery(value: unknown): string {
  if (Array.isArray(value)) return readQuery(value[0]);
  return typeof value === "string" ? value : "";
}

function currentQuery(overrides: Partial<QueryState> = {}): QueryState {
  return {
    q: queryText.value,
    section: sectionSlug.value,
    category: categorySlug.value,
    page: Number(route.query.page ?? 1) || 1,
    sortId: sort.value,
    span: span.value,
    ...overrides,
  };
}

function sameQuery(query: Record<string, string>): boolean {
  const keys = new Set([...Object.keys(query), ...Object.keys(route.query)]);
  for (const key of keys) {
    if ((query[key] ?? "") !== readQuery(route.query[key])) return false;
  }
  return true;
}

function writeQuery(next: QueryState) {
  const bounds = domain.value;
  const query: Record<string, string> = {};
  if (next.section) query.section = next.section;
  if (next.category && next.section) query.category = next.category;
  Object.assign(
    query,
    listingQuery({
      q: next.q,
      page: next.page,
      sort: next.sortId,
      span: next.span,
      floor: bounds?.floor ?? 0,
      ceil: bounds?.ceil ?? 0,
    }),
  );
  if (sameQuery(query)) return;
  router.replace({ query }).catch(() => {});
}

function onInput(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  draft.value = value;
  writeQuery(currentQuery({ q: value, page: 1 }));
}

function clearSearch() {
  draft.value = "";
  writeQuery(currentQuery({ q: "", page: 1 }));
  document.getElementById("catalog-search")?.focus();
}

function pickSection(slug: string) {
  writeQuery(currentQuery({ section: slug, category: "", page: 1 }));
}

function pickCategory(slug: string) {
  writeQuery(currentQuery({ category: slug, page: 1 }));
}

function showAll() {
  sortMenu.value?.close();
  draft.value = "";
  const bounds = domain.value;
  writeQuery({
    q: "",
    section: "",
    category: "",
    page: 1,
    sortId: null,
    span: bounds ? { min: bounds.floor, max: bounds.ceil } : null,
  });
}

function onSort(id: SortId) {
  if (id === sort.value) return;
  writeQuery(currentQuery({ sortId: id, page: 1 }));
}

function onSpan(next: Span) {
  const current = span.value;
  if (current && next.min === current.min && next.max === current.max) return;
  writeQuery(currentQuery({ span: next, page: 1 }));
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

/** Price row ends on the sort face. Narrow screens use the stacked width. */
function measureLine() {
  const wide = typeof window.matchMedia === "function" && window.matchMedia("(min-width: 640px)").matches;
  const cluster = clusterEl.value;
  const face = sortMenu.value?.faceEl() ?? null;
  if (!wide || !cluster || !face) {
    if (lineWidth.value !== null) lineWidth.value = null;
    return;
  }
  const clusterBox = cluster.getBoundingClientRect();
  const faceBox = face.getBoundingClientRect();
  const rtl = document.documentElement.dir === "rtl";
  const width = Math.round(rtl ? clusterBox.right - faceBox.left : faceBox.right - clusterBox.left);
  const next = width > 0 ? width : null;
  if (next !== lineWidth.value) lineWidth.value = next;
}

watch(
  () => [state.value, items.value.length, route.fullPath] as const,
  () => {
    if (state.value !== "ready") return;
    writeQuery(currentQuery({ page: paged.value.current }));
  },
);

watch(state, async (value) => {
  if (value !== "ready") return;
  await nextTick();
  measureLine();
});

watch(locale, async () => {
  await nextTick();
  measureLine();
});

onMounted(() => {
  load();
  measureLine();
  window.addEventListener("resize", measureLine);
  document.fonts?.ready.then(() => measureLine());
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", measureLine);
});
</script>

<template>
  <ShopLoader v-if="state === 'loading'" />
  <section v-else class="mx-auto w-full max-w-7xl px-5 py-12">
    <p class="font-heading text-xs font-bold uppercase text-primary">{{ t(locale, "arcadeKicker") }}</p>
    <h1 class="mt-2 text-balance font-heading text-4xl font-bold">{{ t(locale, "allProducts") }}</h1>
    <p class="mt-2 text-pretty text-muted-foreground">{{ t(locale, "allProductsBody") }}</p>
    <div class="catalog-stack mt-7">
      <div ref="clusterEl" class="catalog-toolbar">
        <ArcadeKey variant="choice" chip :state="filtersClear ? 'on' : 'off'" class="w-fit shrink-0" @click="showAll">
          {{ t(locale, "allItems") }}
        </ArcadeKey>
        <CatalogMenus
          :locale="locale"
          :items="items"
          :section="sectionSlug"
          :category="categorySlug"
          @section="pickSection"
          @category="pickCategory"
        />
        <SortMenu ref="sortMenu" :locale="locale" :sort="sort" @pick="onSort" />
        <div class="catalog-find-hit">
          <div class="catalog-find">
            <span class="catalog-glass" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
                <g fill="currentColor" shape-rendering="crispEdges">
                  <rect x="5" y="1" width="4" height="1" />
                  <rect x="3" y="2" width="2" height="1" />
                  <rect x="9" y="2" width="2" height="1" />
                  <rect x="2" y="3" width="1" height="4" />
                  <rect x="11" y="3" width="1" height="4" />
                  <rect x="3" y="7" width="2" height="1" />
                  <rect x="9" y="7" width="2" height="1" />
                  <rect x="5" y="8" width="4" height="1" />
                  <rect x="9" y="8" width="2" height="1" />
                  <rect x="10" y="9" width="2" height="1" />
                  <rect x="11" y="10" width="2" height="1" />
                  <rect x="12" y="11" width="2" height="1" />
                  <rect x="13" y="12" width="2" height="1" />
                </g>
              </svg>
            </span>
            <input
              id="catalog-search"
              :value="draft"
              type="search"
              :aria-label="t(locale, 'searchLabel')"
              :placeholder="t(locale, 'searchPlaceholder')"
              @input="onInput"
            />
            <button
              v-if="draft"
              class="catalog-clear"
              type="button"
              :aria-label="t(locale, 'clearSearch')"
              @click="clearSearch"
            >
              <svg viewBox="0 0 7 7" width="14" height="14" aria-hidden="true">
                <g fill="currentColor" shape-rendering="crispEdges">
                  <rect x="0" y="0" width="1" height="1" />
                  <rect x="6" y="0" width="1" height="1" />
                  <rect x="1" y="1" width="1" height="1" />
                  <rect x="5" y="1" width="1" height="1" />
                  <rect x="2" y="2" width="1" height="1" />
                  <rect x="4" y="2" width="1" height="1" />
                  <rect x="3" y="3" width="1" height="1" />
                  <rect x="2" y="4" width="1" height="1" />
                  <rect x="4" y="4" width="1" height="1" />
                  <rect x="1" y="5" width="1" height="1" />
                  <rect x="5" y="5" width="1" height="1" />
                  <rect x="0" y="6" width="1" height="1" />
                  <rect x="6" y="6" width="1" height="1" />
                </g>
              </svg>
            </button>
          </div>
        </div>
      </div>
      <PriceRange
        v-if="domain && span"
        :locale="locale"
        :floor="domain.floor"
        :ceil="domain.ceil"
        :min="span.min"
        :max="span.max"
        :line-width="lineWidth"
        @change="onSpan"
      />
    </div>
    <div v-if="state === 'error'" class="mt-10">
      <p class="font-heading">{{ t(locale, "error") }}</p>
      <ArcadeKey class="mt-4" @click="load">{{ t(locale, "retry") }}</ArcadeKey>
    </div>
    <template v-else>
      <p v-if="filtered.length === 0" class="mt-10 font-heading">{{ t(locale, priceNarrowed ? "noPrice" : "noResults") }}</p>
      <div v-else class="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <ProductCard v-for="item in paged.slice" :key="item.slug" :item="item" :locale="locale" @add="add" />
      </div>
      <nav v-if="paged.pages > 1" class="mt-9 flex items-center justify-center gap-2" :aria-label="t(locale, 'pagination')">
        <ArcadeKey
          variant="choice"
          square
          :aria-label="t(locale, 'previous')"
          :disabled="paged.current <= 1"
          @click="writeQuery(currentQuery({ page: paged.current - 1 }))"
        >
          <span class="page-prev" aria-hidden="true">&lt;</span>
        </ArcadeKey>
        <ArcadeKey variant="choice" square state="on" aria-current="page">{{ paged.current }}</ArcadeKey>
        <ArcadeKey
          v-if="paged.current < paged.pages"
          variant="choice"
          square
          state="off"
          @click="writeQuery(currentQuery({ page: paged.current + 1 }))"
        >
          {{ paged.current + 1 }}
        </ArcadeKey>
        <ArcadeKey
          variant="choice"
          square
          :aria-label="t(locale, 'next')"
          :disabled="paged.current >= paged.pages"
          @click="writeQuery(currentQuery({ page: paged.current + 1 }))"
        >
          <span class="page-next" aria-hidden="true">&gt;</span>
        </ArcadeKey>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.catalog-stack {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  min-width: 0;
}
</style>
