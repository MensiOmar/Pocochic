<script setup lang="ts">
import { styleDetailSchema, type Locale, type StyleDetail, type Variant } from "@pocochic/contracts";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { api, catalogSrc } from "../api";
import PriceTag from "../components/PriceTag.vue";
import { t } from "../i18n";
import { formatTnd } from "../money";
import { defaultVariantId, optionKind, optionLabel, orderedVariants, showOptionRow } from "../options";
import { useCartStore } from "../stores/cart";

const route = useRoute();
const cart = useCartStore();
const locale = computed(() => route.params.locale as Locale);
const style = ref<StyleDetail | null>(null);
const selectedId = ref<string | null>(null);
const capped = ref(false);
const state = ref<"loading" | "ready" | "error" | "missing">("loading");

let request = 0;

async function load() {
  const slug = String(route.params.slug ?? "");
  const current = ++request;
  state.value = "loading";
  style.value = null;
  selectedId.value = null;
  capped.value = false;
  if (!slug) {
    state.value = "missing";
    return;
  }
  const res = await api.styles[":slug"].$get({ param: { slug } });
  if (current !== request) return;
  if (res.status === 404) {
    state.value = "missing";
    return;
  }
  if (!res.ok) {
    state.value = "error";
    return;
  }
  const body = styleDetailSchema.parse(await res.json());
  if (current !== request) return;
  style.value = body;
  selectedId.value = defaultVariantId(body.variants);
  state.value = "ready";
}

function select(id: string) {
  const variant = style.value?.variants.find((item) => item.id === id);
  if (!variant || variant.availableQty <= 0) return;
  selectedId.value = id;
  capped.value = false;
}

function addSelected() {
  const current = style.value;
  const variant = current?.variants.find((item) => item.id === selectedId.value);
  if (!current || !variant) return;
  const added = cart.add({
    variantId: variant.id,
    quantity: 1,
    slug: current.slug,
    itemCode: current.itemCode,
    displayName: current.displayName,
    size: variant.size,
    reference: variant.reference,
    unitPriceCents: variant.priceCents,
    imagePath: current.imagePath,
    availableQty: variant.availableQty,
  });
  capped.value = !added;
}

function optionClass(variant: Variant): string {
  if (variant.availableQty <= 0) return "cursor-default bg-card text-muted-foreground opacity-60";
  if (variant.id === selectedId.value) return "cursor-pointer bg-primary";
  return "cursor-pointer bg-card";
}

const ordered = computed(() => orderedVariants(style.value?.variants ?? []));
const optionsVisible = computed(() => showOptionRow(style.value?.variants ?? []));
const kind = computed(() => optionKind(style.value?.variants ?? []));
const selected = computed(() => style.value?.variants.find((variant) => variant.id === selectedId.value) ?? null);
const shownCents = computed(() => selected.value?.priceCents ?? style.value?.priceCents ?? 0);
const description = computed(() => style.value?.description?.trim() ?? "");
const showCode = computed(() => {
  const current = style.value;
  return current !== null && current.itemCode.trim() !== current.displayName.trim();
});
const photo = computed(() => catalogSrc(style.value?.imagePath ?? null));

onMounted(load);
watch(() => route.params.slug, load);
</script>

<template>
  <section v-if="state === 'loading'" class="mx-auto w-full max-w-7xl px-5 py-8 font-heading">{{ t(locale, "loading") }}</section>
  <section v-else-if="state === 'error'" class="mx-auto w-full max-w-7xl px-5 py-8">
    <p class="font-heading">{{ t(locale, "error") }}</p>
    <button type="button" class="mt-4 min-h-11 cursor-pointer rounded-lg border-2 border-border bg-primary px-5 font-heading text-sm font-bold uppercase" @click="load">
      {{ t(locale, "retry") }}
    </button>
  </section>
  <section v-else-if="state === 'missing' || !style" class="mx-auto w-full max-w-7xl px-5 py-8">
    <p class="font-heading">{{ t(locale, "notFound") }}</p>
    <RouterLink :to="`/${locale}/shop`" class="mt-6 inline-flex min-h-11 items-center font-heading text-sm font-bold uppercase">
      {{ t(locale, "backToShop") }}
    </RouterLink>
  </section>
  <div v-else class="mx-auto w-full max-w-7xl px-5 py-8">
    <RouterLink :to="`/${locale}/shop`" class="mb-6 inline-flex min-h-11 items-center gap-2 font-heading text-sm font-bold uppercase">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="rtl:rotate-180" aria-hidden="true">
        <path d="m12 19-7-7 7-7" />
        <path d="M19 12H5" />
      </svg>
      {{ t(locale, "backToShop") }}
    </RouterLink>
    <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section>
        <div class="grid h-[480px] place-items-center rounded-xl border-2 border-border bg-card p-3 shadow-md">
          <div class="grid h-full w-full place-items-center overflow-hidden rounded-lg bg-muted">
            <img
              v-if="photo"
              :src="photo"
              :alt="style.displayName"
              class="max-h-full max-w-full rounded-lg object-contain p-3"
              :class="style.isSoldOut ? 'opacity-70 grayscale' : ''"
            />
            <div v-else class="grid place-items-center gap-3 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
                <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span class="font-heading text-xs uppercase text-muted-foreground">{{ t(locale, "productImage") }}</span>
            </div>
          </div>
        </div>
      </section>
      <section class="lg:pt-5">
        <p v-if="showCode" class="font-heading text-xs font-bold text-primary">{{ style.itemCode }}</p>
        <h1 class="text-balance font-heading text-4xl font-bold" :class="showCode ? 'mt-2' : ''">{{ style.displayName }}</h1>
        <p v-if="description" class="mt-3 text-pretty text-muted-foreground">{{ description }}</p>
        <div class="mt-5">
          <PriceTag :cents="shownCents" prominent />
        </div>
        <div v-if="optionsVisible" class="mt-6 border-y-2 border-border py-5">
          <p class="font-heading text-xs font-bold uppercase">{{ t(locale, kind === "size" ? "pickSize" : "pickOne") }}</p>
          <div class="mt-3 flex flex-wrap gap-2" role="group" :aria-label="t(locale, kind === 'size' ? 'pickSize' : 'pickOne')">
            <button
              v-for="variant in ordered"
              :key="variant.id"
              type="button"
              class="grid min-h-11 min-w-11 place-items-center rounded-lg border-2 border-border px-3 font-heading font-bold"
              :class="optionClass(variant)"
              :disabled="variant.availableQty <= 0"
              :aria-pressed="variant.id === selectedId"
              @click="select(variant.id)"
            >
              {{ optionLabel(variant) }}
            </button>
          </div>
        </div>
        <button
          v-if="selected"
          type="button"
          class="mt-6 flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-border bg-primary px-6 py-3 text-center font-heading text-sm font-bold uppercase shadow-md"
          @click="addSelected"
        >
          {{ t(locale, "addToCart") }} · <span dir="ltr">{{ formatTnd(selected.priceCents) }}</span>
        </button>
        <p v-if="selected && capped" class="mt-3 font-heading text-sm text-destructive" role="status">{{ t(locale, "stockCap") }}</p>
        <div
          v-else-if="!selected"
          class="mt-6 grid min-h-11 w-full place-items-center rounded-lg border-2 border-border bg-destructive px-6 font-heading text-sm font-bold uppercase text-destructive-foreground"
        >
          {{ t(locale, "unavailable") }}
        </div>
        <div class="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-lg bg-muted p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
              <path d="m16 16 2 2 4-4" />
              <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14" />
              <path d="M7.5 4.27 16.5 9.42" />
              <path d="m3.29 7 8.71 5 8.71-5" />
              <path d="M12 22V12" />
            </svg>
            <p class="mt-2 text-xs font-bold">{{ t(locale, "packedWithCare") }}</p>
          </div>
          <div class="rounded-lg bg-muted p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
              <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" />
              <path d="M20 2v4" />
              <path d="M22 4h-4" />
              <path d="M4 18v2" />
              <path d="M5 19H3" />
            </svg>
            <p class="mt-2 text-xs font-bold">{{ t(locale, "smallBatch") }}</p>
          </div>
          <div class="rounded-lg bg-muted p-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <p class="mt-2 text-xs font-bold">{{ t(locale, "giftReady") }}</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
