<script setup lang="ts">
import { thankYouSchema, type Locale } from "@pocochic/contracts";
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { api } from "../api";
import { readReceipt } from "../checkout";
import ArcadeKey from "../components/ArcadeKey.vue";
import { t } from "../i18n";

const route = useRoute();
const router = useRouter();
const locale = computed(() => route.params.locale as Locale);
const orderNumber = ref("");
const body = ref("");
const ready = ref(false);
let loadToken = 0;

async function show() {
  const token = ++loadToken;
  const receipt = readReceipt();
  if (!receipt) {
    await router.replace({ name: "home", params: { locale: locale.value } });
    return;
  }
  orderNumber.value = receipt.orderNumber;
  if (!body.value) body.value = receipt.thankYou.body;
  ready.value = true;
  try {
    const res = await api["thank-you"].$get({ query: { locale: locale.value } });
    if (!res.ok || token !== loadToken) return;
    const parsed = thankYouSchema.safeParse(await res.json());
    if (parsed.success && parsed.data.body.trim()) body.value = parsed.data.body;
  } catch {
    // The receipt text stays on screen.
  }
}

onMounted(() => {
  void show();
});

watch(locale, () => {
  body.value = "";
  void show();
});
</script>

<template>
  <section v-if="ready" class="mx-auto flex w-full max-w-md flex-1 items-center px-5 py-10">
    <div class="w-full rounded-xl border-2 border-border bg-card p-6 text-center shadow-md">
      <div class="mx-auto grid h-20 w-20 place-items-center rounded-xl border-2 border-border bg-primary shadow-md">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </div>
      <p class="mt-5 font-heading text-xs font-bold uppercase text-tertiary">{{ t(locale, "questComplete") }}</p>
      <h1 class="mt-2 text-balance font-heading text-2xl font-bold">{{ t(locale, "thanksTitle") }}</h1>
      <p class="mt-3 font-heading text-sm font-bold">
        <span class="text-muted-foreground">{{ t(locale, "orderNumber") }}</span>
        <span class="ms-2" dir="ltr">{{ orderNumber }}</span>
      </p>
      <p class="mt-3 whitespace-pre-line text-pretty text-sm text-muted-foreground">{{ body }}</p>
      <div class="mt-5 rounded-lg border-2 border-border bg-accent p-4 text-start">
        <div class="flex gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0 text-primary" aria-hidden="true">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
          <p class="text-sm">{{ t(locale, "instagramHelp") }}</p>
        </div>
      </div>
      <ArcadeKey block class="mt-6" :to="`/${locale}`">{{ t(locale, "continueShopping") }}</ArcadeKey>
    </div>
  </section>
</template>
