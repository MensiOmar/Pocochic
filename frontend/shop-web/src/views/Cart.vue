<script setup lang="ts">
import type { Locale, StoredCartLine } from "@pocochic/contracts";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute } from "vue-router";
import { catalogSrc } from "../api";
import { lineMeta, refreshCart, requestPromoQuote, type PromoErrorKind } from "../cart-sync";
import PriceTag from "../components/PriceTag.vue";
import { t } from "../i18n";
import { useCartStore } from "../stores/cart";

const route = useRoute();
const cart = useCartStore();
const locale = computed(() => route.params.locale as Locale);
const draft = ref(cart.promoCode);
const locked = ref(cart.lines.length > 0);
const refreshComplete = ref(cart.lines.length === 0);
const notice = ref(false);
const promoError = ref<PromoErrorKind | null>(null);
let alive = true;

const promoMessage = computed(() => {
  if (promoError.value === "promo_unknown") return t(locale.value, "promoUnknown");
  if (promoError.value === "promo_exhausted") return t(locale.value, "promoExhausted");
  if (promoError.value === "promo_min_count") return t(locale.value, "promoMin");
  if (promoError.value === "unavailable") return t(locale.value, "promoUnavailable");
  if (promoError.value === "unconfirmed") return t(locale.value, "promoUnconfirmed");
  return "";
});
const applyDisabled = computed(() => locked.value || !refreshComplete.value);

function atCap(line: StoredCartLine) {
  return line.quantity >= line.availableQty || line.quantity >= 99;
}

onMounted(() => {
  void openBag();
});

onUnmounted(() => {
  alive = false;
});

async function openBag() {
  draft.value = cart.promoCode;
  promoError.value = null;
  notice.value = false;
  if (cart.lines.length === 0) {
    locked.value = false;
    refreshComplete.value = true;
    return;
  }
  locked.value = true;
  refreshComplete.value = false;
  const plan = await refreshCart(cart.lines);
  if (!alive) return;
  cart.applyRefresh(plan);
  notice.value = plan.priceChanged || plan.qtyLowered || plan.removed;
  if (cart.lines.length === 0) {
    locked.value = false;
    refreshComplete.value = true;
    return;
  }
  refreshComplete.value = plan.complete;
  if (!plan.complete) {
    if (cart.promoCode.trim()) promoError.value = "unconfirmed";
    locked.value = false;
    return;
  }
  if (cart.promoCode.trim()) {
    await runQuote();
    return;
  }
  locked.value = false;
}

async function runQuote() {
  const code = cart.promoCode.trim();
  if (!code || !refreshComplete.value || cart.lines.length === 0) {
    locked.value = false;
    return;
  }
  locked.value = true;
  promoError.value = null;
  cart.dropQuote();
  const result = await requestPromoQuote(
    code,
    cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })),
  );
  if (!alive) return;
  if (result.ok) {
    cart.acceptQuote(result.quote);
    draft.value = result.quote.code;
  } else promoError.value = result.kind;
  locked.value = false;
}

async function applyPromo() {
  if (applyDisabled.value) return;
  const code = draft.value.trim();
  draft.value = code;
  if (!code) {
    if (cart.promoCode) {
      cart.clearPromo();
      promoError.value = null;
    }
    return;
  }
  cart.commitPromo(code);
  await runQuote();
}

function clearCode() {
  if (locked.value) return;
  cart.clearPromo();
  draft.value = "";
  promoError.value = null;
}

async function changeQty(variantId: string, quantity: number) {
  if (locked.value) return;
  cart.setQty(variantId, quantity);
  if (!refreshComplete.value || !cart.promoCode.trim()) return;
  await runQuote();
}

async function removeLine(variantId: string) {
  if (locked.value) return;
  cart.remove(variantId);
  if (cart.lines.length === 0 || !refreshComplete.value || !cart.promoCode.trim()) return;
  await runQuote();
}

function clearBag() {
  if (locked.value) return;
  cart.clear();
  draft.value = "";
  promoError.value = null;
  notice.value = false;
}

function increase(line: StoredCartLine) {
  if (atCap(line)) return;
  void changeQty(line.variantId, line.quantity + 1);
}

function decrease(line: StoredCartLine) {
  if (line.quantity <= 1) return;
  void changeQty(line.variantId, line.quantity - 1);
}
</script>

<template>
  <section v-if="cart.lines.length === 0" class="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-5 py-16 text-center">
    <div class="relative grid h-48 w-48 place-items-center rounded-xl border-2 border-border bg-accent shadow-md sm:h-56 sm:w-56">
      <div class="grid h-28 w-32 place-items-center rounded-lg border-2 border-border bg-card shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18" />
          <path d="M16 10a4 4 0 0 1-8 0" />
        </svg>
      </div>
      <span class="absolute -bottom-3 -end-4 rounded-lg border-2 border-border bg-tertiary px-3 py-2 font-heading text-xs font-bold uppercase">{{ t(locale, "emptyBadge") }}</span>
    </div>
    <p class="mt-10 font-heading text-xs font-bold uppercase text-primary">{{ t(locale, "emptyKicker") }}</p>
    <h1 class="mt-3 text-balance font-heading text-3xl font-bold sm:text-4xl">{{ t(locale, "emptyTitle") }}</h1>
    <p class="mt-4 max-w-xl text-pretty text-base text-muted-foreground">{{ t(locale, "emptyBody") }}</p>
    <RouterLink :to="`/${locale}/shop`" class="mt-8 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-border bg-primary px-6 font-heading text-sm font-bold uppercase shadow-md">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="6" x2="10" y1="12" y2="12" />
        <line x1="8" x2="8" y1="10" y2="14" />
        <line x1="15" x2="15.01" y1="13" y2="13" />
        <line x1="18" x2="18.01" y1="11" y2="11" />
        <rect width="20" height="12" x="2" y="6" rx="2" />
      </svg>
      {{ t(locale, "browseGoodies") }}
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="rtl:rotate-180" aria-hidden="true">
        <path d="M5 12h14" />
        <path d="m12 5 7 7-7 7" />
      </svg>
    </RouterLink>
    <div class="mt-9 flex items-center gap-3 font-heading text-xs uppercase text-muted-foreground">
      <span class="h-2 w-2 bg-primary"></span>
      <span>{{ t(locale, "pressStart") }}</span>
      <span class="h-2 w-2 bg-tertiary"></span>
    </div>
  </section>

  <div v-else class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-3">
    <section class="lg:col-span-2">
      <div class="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <p class="font-heading text-xs font-bold uppercase text-primary">{{ t(locale, "playlistKicker") }}</p>
          <h1 class="mt-1 text-balance font-heading text-3xl font-bold sm:text-4xl">{{ t(locale, "bagTitle") }}</h1>
        </div>
        <button
          type="button"
          class="min-h-11 cursor-pointer rounded-lg border-2 border-border bg-card px-4 font-heading text-xs font-bold uppercase shadow-md disabled:cursor-default disabled:opacity-40"
          :disabled="locked"
          @click="clearBag"
        >
          {{ t(locale, "clearCart") }}
        </button>
      </div>
      <p v-if="notice" role="status" class="mb-4 font-heading text-sm text-primary">{{ t(locale, "bagUpdated") }}</p>
      <div class="space-y-4">
        <article v-for="line in cart.lines" :key="line.variantId" class="flex flex-col gap-4 rounded-xl border-2 border-border bg-card p-4 shadow-md sm:flex-row">
          <div class="grid h-32 w-full shrink-0 place-items-center overflow-hidden rounded-lg bg-muted sm:w-36">
            <img v-if="catalogSrc(line.imagePath)" :src="catalogSrc(line.imagePath)!" :alt="line.displayName" class="h-full w-full object-contain p-2" />
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-heading text-xs text-muted-foreground">{{ lineMeta(line) }}</p>
            <h2 class="mt-1 font-heading text-lg font-semibold">{{ line.displayName }}</h2>
            <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex flex-wrap items-center gap-2" role="group" :aria-label="t(locale, 'qty')">
                <span class="font-heading text-sm">{{ t(locale, "qty") }}</span>
                <button
                  type="button"
                  class="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border-2 border-border bg-card font-heading text-lg font-bold disabled:cursor-default disabled:opacity-40"
                  :aria-label="t(locale, 'decreaseQty')"
                  :disabled="locked || line.quantity <= 1"
                  @click="decrease(line)"
                >
                  −
                </button>
                <span class="min-w-6 text-center font-heading">{{ line.quantity }}</span>
                <button
                  type="button"
                  class="grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border-2 border-border bg-card font-heading text-lg font-bold disabled:cursor-default disabled:opacity-40"
                  :aria-label="t(locale, 'increaseQty')"
                  :disabled="locked || atCap(line)"
                  @click="increase(line)"
                >
                  +
                </button>
                <button
                  type="button"
                  class="min-h-11 cursor-pointer px-2 font-heading text-xs font-bold uppercase text-destructive disabled:cursor-default disabled:opacity-40"
                  :aria-label="`${t(locale, 'removeLine')} ${line.displayName}`"
                  :disabled="locked"
                  @click="removeLine(line.variantId)"
                >
                  {{ t(locale, "removeLine") }}
                </button>
              </div>
              <PriceTag :cents="line.unitPriceCents * line.quantity" large />
            </div>
          </div>
        </article>
      </div>
    </section>

    <aside class="h-fit rounded-xl border-2 border-border bg-secondary p-5 shadow-md" :aria-label="t(locale, 'orderSummary')">
      <h2 class="font-heading text-xl font-bold">{{ t(locale, "orderSummary") }}</h2>
      <div class="mt-5 space-y-3 border-b-2 border-border pb-5">
        <div class="flex items-center justify-between gap-3">
          <span>{{ t(locale, "subtotal") }}</span>
          <PriceTag :cents="cart.subtotalCents" plain compact />
        </div>
        <div v-if="cart.quote" class="flex items-center justify-between gap-3">
          <span>{{ t(locale, "discount") }}</span>
          <PriceTag :cents="-cart.discountCents" plain compact />
        </div>
        <div class="flex items-center justify-between gap-3">
          <span>{{ t(locale, "delivery") }}</span>
          <PriceTag :cents="cart.deliveryCents" plain compact />
        </div>
      </div>
      <div class="mt-4 flex items-center justify-between gap-3 text-lg">
        <span class="font-heading font-bold uppercase">{{ t(locale, "total") }}</span>
        <PriceTag :cents="cart.totalCents" plain />
      </div>
      <form class="mt-5" @submit.prevent="applyPromo">
        <label for="promo-code" class="block font-heading text-xs font-bold uppercase">{{ t(locale, "promoTape") }}</label>
        <div class="mt-2 flex gap-2">
          <input
            id="promo-code"
            v-model="draft"
            :placeholder="t(locale, 'promoPlaceholder')"
            :disabled="locked"
            :aria-invalid="promoMessage ? true : undefined"
            :aria-describedby="promoMessage ? 'promo-error' : undefined"
            class="min-h-11 w-full rounded-lg border-2 border-input bg-card px-3 font-heading text-sm disabled:opacity-40"
          />
          <button
            type="submit"
            class="min-h-11 cursor-pointer rounded-lg border-2 border-border bg-card px-4 font-heading text-xs font-bold uppercase disabled:cursor-default disabled:opacity-40"
            :disabled="applyDisabled"
          >
            {{ t(locale, "applyPromo") }}
          </button>
          <button
            v-if="cart.quote"
            type="button"
            class="min-h-11 cursor-pointer rounded-lg border-2 border-border bg-card px-4 font-heading text-xs font-bold uppercase disabled:cursor-default disabled:opacity-40"
            :aria-label="t(locale, 'clearPromoCode')"
            :disabled="locked"
            @click="clearCode"
          >
            {{ t(locale, "clearPromo") }}
          </button>
        </div>
        <p v-if="promoMessage" id="promo-error" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ promoMessage }}</p>
      </form>
      <RouterLink :to="`/${locale}/checkout`" class="mt-5 flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-border bg-primary font-heading text-sm font-bold uppercase">
        {{ t(locale, "checkout") }}
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="rtl:rotate-180" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="m12 5 7 7-7 7" />
        </svg>
      </RouterLink>
    </aside>
  </div>
</template>
