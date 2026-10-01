<script setup lang="ts">
import type { Locale, StyleListItem } from "@pocochic/contracts";
import { computed } from "vue";
import { catalogSrc } from "../api";
import { t } from "../i18n";
import { sizeRange } from "../sizes";
import PriceTag from "./PriceTag.vue";

const props = defineProps<{ item: StyleListItem; locale: Locale }>();
const emit = defineEmits<{ add: [StyleListItem] }>();

const src = computed(() => catalogSrc(props.item.imagePath));
const shownCents = computed(() => props.item.soleVariant?.priceCents ?? props.item.priceCents);
const range = computed(() => sizeRange(props.item.sizes));
const detail = computed(() => (props.item.isSoldOut ? t(props.locale, "soldOut") : (range.value ?? "")));
</script>

<template>
  <article class="overflow-hidden rounded-xl border-2 border-border bg-card shadow-md">
    <div class="relative flex h-60 items-center justify-center overflow-hidden rounded-t-[10px] border-b-2 border-border bg-muted p-3">
      <img
        v-if="src"
        :src="src"
        :alt="item.displayName"
        class="block max-h-52 max-w-full rounded-xl object-contain"
        :class="item.isSoldOut ? 'opacity-70 grayscale' : ''"
      />
      <button
        v-if="item.soleVariant"
        type="button"
        class="absolute left-4 top-4 z-10 grid min-h-11 min-w-11 cursor-pointer place-items-center rounded-lg border-2 border-border bg-primary font-heading text-xl font-bold"
        :aria-label="t(locale, 'addToCart')"
        @click="emit('add', item)"
      >
        +
      </button>
      <span
        v-else-if="item.isSoldOut"
        class="absolute left-4 top-4 z-10 rounded-lg border-2 border-border bg-destructive px-2 py-1 font-heading text-xs font-bold uppercase text-destructive-foreground"
      >
        {{ t(locale, "unavailable") }}
      </span>
    </div>
    <div class="flex min-h-44 flex-col p-4">
      <p
        class="h-4 truncate font-heading text-xs leading-4"
        :class="item.isSoldOut ? 'uppercase text-destructive' : 'text-muted-foreground'"
      >
        {{ detail }}
      </p>
      <div class="mt-1 flex items-start justify-between gap-3">
        <h2 class="min-w-0 font-heading text-lg font-semibold leading-7">{{ item.displayName }}</h2>
        <PriceTag :cents="shownCents" class="h-7" />
      </div>
      <RouterLink
        :to="`/${locale}/p/${item.slug}`"
        class="mt-auto grid min-h-11 w-full place-items-center rounded-lg border-2 border-border bg-primary font-heading text-sm font-bold uppercase"
      >
        {{ t(locale, "viewItem") }}
      </RouterLink>
    </div>
  </article>
</template>
