<script setup lang="ts">
import {
  checkoutResponseSchema,
  delegationSchema,
  errorBodySchema,
  governorateSchema,
  type Delegation,
  type Governorate,
  type Locale,
  type StockConflictItem,
} from "@pocochic/contracts";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import cartEmpty from "@assets/cart-empty.svg";
import { api, catalogSrc } from "../api";
import { refreshCart, requestPromoQuote, type PromoErrorKind } from "../cart-sync";
import ArcadeKey from "../components/ArcadeKey.vue";
import PriceTag from "../components/PriceTag.vue";
import { checkoutIssues, isBlockingIssue, joinName, phoneDigits, saveReceipt, summaryMeta, type CheckoutIssue } from "../checkout";
import { promoErrorMessage, t } from "../i18n";
import { useCartStore } from "../stores/cart";
import { useCheckoutDraftStore } from "../stores/checkout-draft";

const route = useRoute();
const router = useRouter();
const cart = useCartStore();
const draft = useCheckoutDraftStore();
const locale = computed(() => route.params.locale as Locale);

const governorates = ref<Governorate[]>([]);
const delegations = ref<Delegation[]>([]);
const pending = ref(true);
const bagHold = ref(false);
const promoHold = ref(false);
const geoHold = ref(true);
const notice = ref(false);
const attempted = ref(false);
const sending = ref(false);
const leaving = ref(false);
const promoError = ref<PromoErrorKind | null>(null);
const orderError = ref<"failed" | "invalid" | null>(null);
const stockItems = ref<StockConflictItem[]>([]);
let delegationToken = 0;
let quoteGeneration = 0;
let alive = true;

const issues = computed(() => checkoutIssues({
  firstName: draft.firstName,
  lastName: draft.lastName,
  phone: draft.phone,
  governorateId: draft.governorateId,
  delegationId: draft.delegationId,
  address: draft.address,
  social: draft.social,
}));
const held = computed(() => pending.value || bagHold.value || promoHold.value || geoHold.value || sending.value || issues.value.some(isBlockingIssue));
const promoMessage = computed(() => (promoError.value ? promoErrorMessage(locale.value, promoError.value) : ""));
const orderMessage = computed(() => {
  if (orderError.value === "invalid") return t(locale.value, "orderInvalid");
  if (orderError.value === "failed") return t(locale.value, "orderFailed");
  return "";
});

function showIssue(issue: CheckoutIssue): boolean {
  return issues.value.includes(issue) && (isBlockingIssue(issue) || attempted.value);
}

function issueMessage(issue: CheckoutIssue): string {
  if (issue === "phone") return t(locale.value, "phoneInvalid");
  if (issue === "addressLong") return t(locale.value, "addressTooLong");
  if (issue === "socialLong") return t(locale.value, "socialTooLong");
  if (issue === "nameLong") return t(locale.value, "nameTooLong");
  return t(locale.value, "fieldRequired");
}

function stockLabel(item: StockConflictItem): string {
  const name = [item.displayName, item.size.trim(), item.reference.trim()].filter((part) => part.length > 0).join(" · ");
  return `${name} — ${item.available}`;
}

onMounted(() => {
  if (cart.lines.length === 0) {
    void router.replace({ name: "cart", params: { locale: locale.value } });
    return;
  }
  void loadGeo();
  void prepare();
});

onUnmounted(() => {
  alive = false;
});

async function loadGeo() {
  geoHold.value = true;
  try {
    const res = await api.governorates.$get();
    if (!alive || leaving.value) return;
    if (!res.ok) throw new Error("geo");
    governorates.value = governorateSchema.array().parse(await res.json());
    if (draft.governorateId) {
      await loadDelegations(draft.governorateId, true);
      return;
    }
    geoHold.value = false;
  } catch {
    if (!alive || leaving.value) return;
    geoHold.value = true;
  }
}

async function loadDelegations(id: string, keepSelection: boolean) {
  const token = ++delegationToken;
  if (!keepSelection) draft.delegationId = "";
  geoHold.value = true;
  try {
    const res = await api.governorates[":id"].delegations.$get({ param: { id } });
    if (!alive || leaving.value || token !== delegationToken) return;
    if (!res.ok) throw new Error("delegations");
    const rows = delegationSchema.array().parse(await res.json());
    delegations.value = rows;
    if (keepSelection && !rows.some((row) => row.id === draft.delegationId)) draft.delegationId = "";
    geoHold.value = false;
  } catch {
    if (!alive || leaving.value || token !== delegationToken) return;
    delegations.value = [];
    geoHold.value = true;
  }
}

function selectGovernorate(event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  draft.governorateId = id;
  draft.delegationId = "";
  delegations.value = [];
  if (!id) {
    geoHold.value = false;
    return;
  }
  void loadDelegations(id, false);
}

function selectCity(event: Event) {
  draft.delegationId = (event.target as HTMLSelectElement).value;
}

async function prepare() {
  pending.value = true;
  bagHold.value = false;
  promoHold.value = false;
  promoError.value = null;
  const plan = await refreshCart(cart.lines);
  if (!alive || leaving.value) return;
  cart.applyRefresh(plan);
  notice.value = plan.priceChanged || plan.qtyLowered || plan.removed;
  if (cart.lines.length === 0) {
    void router.replace({ name: "cart", params: { locale: locale.value } });
    return;
  }
  if (!plan.complete) {
    bagHold.value = true;
    pending.value = false;
    return;
  }
  if (cart.promoCode.trim()) {
    await runQuote();
    return;
  }
  pending.value = false;
}

async function runQuote() {
  const generation = ++quoteGeneration;
  const code = cart.promoCode.trim();
  const lines = cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }));
  if (!code) {
    promoHold.value = false;
    pending.value = false;
    return;
  }
  pending.value = true;
  promoHold.value = false;
  promoError.value = null;
  cart.dropQuote();
  const result = await requestPromoQuote(code, lines);
  if (!alive || leaving.value || generation !== quoteGeneration) return;
  if (result.ok) cart.acceptQuote(result.quote);
  else if (result.kind === "unavailable") {
    promoHold.value = true;
    promoError.value = "unavailable";
  } else {
    cart.clearPromo();
    promoError.value = result.kind;
  }
  pending.value = false;
}

function retryHold() {
  if (geoHold.value) void loadGeo();
  if (bagHold.value || pending.value) void prepare();
  else if (promoHold.value) void runQuote();
}

async function submit() {
  if (held.value) return;
  attempted.value = true;
  orderError.value = null;
  stockItems.value = [];
  if (issues.value.length > 0) return;
  sending.value = true;
  const social = draft.social.trim();
  const customer = {
    fullName: joinName(draft.firstName, draft.lastName),
    phone: phoneDigits(draft.phone),
    governorateId: draft.governorateId,
    delegationId: draft.delegationId,
    city: draft.address.trim(),
    ...(social ? { socialHandle: social } : {}),
  };
  const lines = cart.lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity }));
  const promoCode = cart.quote?.code;
  const idempotencyKey = draft.keyFor(JSON.stringify({ locale: locale.value, customer, lines, promoCode: promoCode ?? "" }));
  try {
    const res = await api.checkout.$post({
      json: {
        locale: locale.value,
        customer,
        lines,
        ...(promoCode ? { promoCode } : {}),
        idempotencyKey,
      },
    });
    if (!alive) return;
    if (res.ok) {
      const parsed = checkoutResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        orderError.value = "failed";
        return;
      }
      leaving.value = true;
      saveReceipt(parsed.data);
      cart.clear();
      draft.clear();
      await router.replace({ name: "confirmation", params: { locale: locale.value } });
      return;
    }
    const body = errorBodySchema.safeParse(await res.json());
    const code = body.success ? body.data.error.code : "validation";
    if (code === "stock_conflict") {
      stockItems.value = body.success ? body.data.error.items ?? [] : [];
      return;
    }
    if (code === "promo_unknown" || code === "promo_exhausted" || code === "promo_min_count") {
      cart.clearPromo();
      promoError.value = code;
      return;
    }
    orderError.value = code === "validation" ? "invalid" : "failed";
  } catch {
    if (alive) orderError.value = "failed";
  } finally {
    if (alive) sending.value = false;
  }
}
</script>

<template>
  <div v-if="leaving || cart.lines.length > 0" class="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-5 py-10 lg:grid-cols-3">
    <section class="lg:col-span-2">
      <div class="mb-6">
        <p class="font-heading text-xs font-bold uppercase text-primary">{{ t(locale, "checkoutKicker") }}</p>
        <h1 class="mt-1 text-balance font-heading text-3xl font-bold">{{ t(locale, "checkoutTitle") }}</h1>
        <p class="mt-2 max-w-xl text-pretty text-sm text-muted-foreground">{{ t(locale, "checkoutBody") }}</p>
      </div>
      <p v-if="notice" role="status" class="mb-4 font-heading text-sm text-primary">{{ t(locale, "bagUpdated") }}</p>
      <p v-if="!pending && (bagHold || geoHold)" role="alert" class="mb-4 font-heading text-sm text-destructive">{{ t(locale, "error") }}</p>
      <ArcadeKey v-if="!pending && (bagHold || geoHold)" class="mb-4" @click="retryHold">
        {{ t(locale, "retry") }}
      </ArcadeKey>
      <form class="rounded-xl border-2 border-border bg-card p-5 shadow-md sm:p-7" @submit.prevent="submit">
        <div class="flex items-center gap-3 border-b-2 border-border pb-4">
          <span class="grid h-10 w-10 place-items-center rounded-lg border-2 border-border bg-accent font-heading font-bold">01</span>
          <div>
            <h2 class="font-heading text-lg font-semibold">{{ t(locale, "playerDetails") }}</h2>
            <p class="text-xs text-muted-foreground">{{ t(locale, "playerDetailsBody") }}</p>
          </div>
        </div>
        <div class="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label for="first-name" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "firstName") }} <span class="text-destructive">*</span></label>
            <input id="first-name" v-model="draft.firstName" autocomplete="given-name" :aria-invalid="showIssue('firstName') || showIssue('nameLong') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm" :placeholder="t(locale, 'firstNamePlaceholder')" />
            <p v-if="showIssue('firstName') || showIssue('nameLong')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage(showIssue('nameLong') ? 'nameLong' : 'firstName') }}</p>
          </div>
          <div>
            <label for="last-name" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "lastName") }} <span class="text-destructive">*</span></label>
            <input id="last-name" v-model="draft.lastName" autocomplete="family-name" :aria-invalid="showIssue('lastName') || showIssue('nameLong') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm" :placeholder="t(locale, 'lastNamePlaceholder')" />
            <p v-if="showIssue('lastName')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage('lastName') }}</p>
          </div>
          <div>
            <label for="phone" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "phoneNumber") }} <span class="text-destructive">*</span></label>
            <input id="phone" v-model="draft.phone" type="tel" inputmode="numeric" autocomplete="tel" :aria-invalid="showIssue('phone') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm" :placeholder="t(locale, 'phonePlaceholder')" />
            <p v-if="showIssue('phone')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage('phone') }}</p>
          </div>
          <div>
            <label for="governorate" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "governorate") }} <span class="text-destructive">*</span></label>
            <select id="governorate" :value="draft.governorateId" :aria-invalid="showIssue('governorate') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm" @change="selectGovernorate">
              <option value="">{{ t(locale, "chooseGovernorate") }}</option>
              <option v-for="item in governorates" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <p v-if="showIssue('governorate')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage('governorate') }}</p>
          </div>
          <div>
            <label for="city" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "city") }} <span class="text-destructive">*</span></label>
            <select id="city" :value="draft.delegationId" :disabled="!draft.governorateId" :aria-invalid="showIssue('city') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm disabled:opacity-40" @change="selectCity">
              <option value="">{{ t(locale, "chooseCity") }}</option>
              <option v-for="item in delegations" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
            <p v-if="showIssue('city')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage('city') }}</p>
          </div>
          <div>
            <label for="social" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "socialLabel") }} <span class="font-sans font-normal normal-case text-muted-foreground">{{ t(locale, "socialOptional") }}</span></label>
            <input id="social" v-model="draft.social" :aria-invalid="showIssue('socialLong') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm" :placeholder="t(locale, 'socialPlaceholder')" />
            <p v-if="showIssue('socialLong')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage('socialLong') }}</p>
          </div>
          <div class="sm:col-span-2">
            <label for="address" class="mb-2 block font-heading text-xs font-bold uppercase">{{ t(locale, "exactAddress") }} <span class="text-destructive">*</span></label>
            <input id="address" v-model="draft.address" autocomplete="street-address" :aria-invalid="showIssue('address') || showIssue('addressLong') || undefined" class="min-h-11 w-full rounded-lg border-2 border-input bg-background px-3 font-sans text-sm" :placeholder="t(locale, 'addressPlaceholder')" />
            <p v-if="showIssue('addressLong') || showIssue('address')" role="alert" class="mt-2 font-heading text-xs text-destructive">{{ issueMessage(showIssue('addressLong') ? 'addressLong' : 'address') }}</p>
          </div>
        </div>
        <div class="mt-7 rounded-lg border-2 border-border bg-muted p-4">
          <div class="flex gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0 text-tertiary" aria-hidden="true">
              <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
            </svg>
            <p class="text-sm text-muted-foreground">{{ t(locale, "privacyNote") }}</p>
          </div>
        </div>
        <div v-if="stockItems.length > 0" role="alert" class="mt-6 rounded-lg border-2 border-border bg-muted p-4">
          <p class="font-heading text-sm text-destructive">{{ t(locale, "stockConflict") }}</p>
          <ul class="mt-2 space-y-1 text-sm">
            <li v-for="item in stockItems" :key="item.variantId">{{ stockLabel(item) }}</li>
          </ul>
        </div>
        <p v-if="orderMessage" role="alert" class="mt-4 font-heading text-sm text-destructive">{{ orderMessage }}</p>
        <ArcadeKey block type="submit" class="mt-6" :disabled="held">{{ t(locale, "submitOrder") }}</ArcadeKey>
      </form>
    </section>
    <aside class="h-fit rounded-xl border-2 border-border bg-secondary p-5 shadow-md" :aria-label="t(locale, 'orderSummary')">
      <div class="flex items-center justify-between">
        <h2 class="font-heading text-xl font-bold">{{ t(locale, "orderSummary") }}</h2>
        <img class="cart-ico" alt="" :src="cartEmpty" />
      </div>
      <div class="mt-5 space-y-4 border-b-2 border-border pb-5">
        <div v-for="line in cart.lines" :key="line.variantId" class="flex gap-3">
          <div class="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border-2 border-border bg-card">
            <img v-if="catalogSrc(line.imagePath)" :src="catalogSrc(line.imagePath)!" :alt="line.displayName" class="h-full w-full object-contain" />
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary" aria-hidden="true">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="font-heading text-xs font-bold">{{ line.displayName }}</p>
            <p class="mt-1 text-xs text-muted-foreground">{{ summaryMeta(line, t(locale, "qtyShort"), line.quantity) }}</p>
          </div>
          <PriceTag :cents="line.unitPriceCents * line.quantity" plain compact />
        </div>
      </div>
      <div class="mt-5 space-y-3">
        <div class="flex items-center justify-between gap-3 text-sm">
          <span>{{ t(locale, "subtotal") }}</span>
          <PriceTag :cents="cart.subtotalCents" plain compact />
        </div>
        <div v-if="cart.quote" class="flex items-center justify-between gap-3 text-sm">
          <span>{{ t(locale, "discount") }}</span>
          <PriceTag :cents="-cart.discountCents" plain compact />
        </div>
        <div class="flex items-center justify-between gap-3 text-sm">
          <span>{{ t(locale, "delivery") }}</span>
          <PriceTag :cents="cart.deliveryCents" plain compact />
        </div>
        <div class="flex items-center justify-between gap-3 border-t-2 border-border pt-4 text-lg">
          <span class="font-heading font-bold uppercase">{{ t(locale, "total") }}</span>
          <PriceTag :cents="cart.totalCents" plain />
        </div>
      </div>
      <p v-if="promoMessage" role="alert" class="mt-4 font-heading text-xs text-destructive">{{ promoMessage }}</p>
      <ArcadeKey v-if="!pending && promoHold" class="mt-3" @click="runQuote">{{ t(locale, "retry") }}</ArcadeKey>
    </aside>
  </div>
</template>
