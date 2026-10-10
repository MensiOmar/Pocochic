<script setup lang="ts">
import type { Locale } from "@pocochic/contracts";
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { catalogSrc } from "../api";
import { t } from "../i18n";
import { formatTnd } from "../money";
import { useCartStore } from "../stores/cart";
import { coinSrc } from "../theme";

const route = useRoute();
const cart = useCartStore();
const locale = computed(() => (route.params.locale as Locale) || "fr");
const shown = ref(false);
const closing = ref(false);
const left = ref(8);
let timer = 0;

const notice = computed(() => cart.notice);
const photo = computed(() => catalogSrc(notice.value?.imagePath ?? null));
const meta = computed(() => {
  const current = notice.value;
  if (!current) return "";
  const size = current.size.trim();
  const reference = current.reference.trim();
  if (size && reference && size !== reference) return `${size} · ${reference}`;
  return size || reference;
});

function close() {
  window.clearInterval(timer);
  if (!shown.value || closing.value) return;
  closing.value = true;
}

function start() {
  window.clearInterval(timer);
  closing.value = false;
  shown.value = true;
  left.value = 8;
  timer = window.setInterval(() => {
    left.value -= 1;
    if (left.value > 0) return;
    window.clearInterval(timer);
    closing.value = true;
  }, 450);
}

watch(
  () => notice.value?.id,
  (id) => {
    if (id) start();
  },
);

onBeforeUnmount(() => window.clearInterval(timer));
</script>

<template>
  <div
    v-if="notice"
    class="added-toast"
    :class="{ 'is-on': shown, 'is-closing': closing }"
    role="status"
    aria-live="polite"
  >
    <img v-if="photo" class="added-thumb" :src="photo" alt="" />
    <span v-else class="added-thumb added-thumb-empty" aria-hidden="true"></span>
    <div class="added-copy">
      <p class="added-kicker">{{ t(locale, "added") }}</p>
      <p class="added-name">{{ notice.displayName }}</p>
      <p class="added-meta">
        <span v-if="meta" class="added-variant">{{ meta }}</span>
        <span class="added-price" dir="ltr">
          {{ formatTnd(notice.unitPriceCents) }}
          <img :src="coinSrc" alt="" />
        </span>
      </p>
    </div>
    <button class="added-x" type="button" :aria-label="t(locale, 'dismissAdded')" @click="close">
      <svg viewBox="0 0 5 5" aria-hidden="true">
        <path fill="currentColor" d="M0 0h1v1H0zm1 1h1v1H1zm1 1h1v1H2zm1 1h1v1H3zm1 1h1v1H4zM4 0h1v1H4zM3 1h1v1H3zM1 3h1v1H1zM0 4h1v1H0z" />
      </svg>
    </button>
    <RouterLink class="added-cart" :to="`/${locale}/cart`">{{ t(locale, "viewCart") }}</RouterLink>
    <span class="added-life" :data-left="left" aria-hidden="true">
      <i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i>
    </span>
  </div>
</template>

<style>
.added-toast {
  position: fixed;
  z-index: 40;
  inset-inline-end: 16px;
  bottom: 16px;
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px 10px;
  align-items: center;
  width: min(320px, calc(100vw - 24px));
  padding: 8px 8px 14px;
  border: 3px solid #0f1015;
  border-radius: 6px;
  background: #fffff9;
  color: #0f1015;
  box-shadow: 4px 4px 0 #351040;
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
  transition: transform 140ms steps(4, end), opacity 80ms steps(2, end);
}

.added-toast.is-on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.added-toast.is-on.is-closing {
  opacity: 0;
  pointer-events: none;
  transition: none;
}

[data-theme="dark"] .added-toast {
  border-color: #c74375;
  background: #351040;
  color: #fffff9;
  box-shadow: 4px 4px 0 #000;
}

.added-thumb {
  grid-row: span 2;
  align-self: center;
  width: 44px;
  height: 44px;
  object-fit: cover;
  border: 2px solid #0f1015;
  border-radius: 4px;
}

.added-thumb-empty { background: #f1e6dd; }

[data-theme="dark"] .added-thumb { border-color: #f4c5cc; }
[data-theme="dark"] .added-thumb-empty { background: #000; }

.added-copy { min-width: 0; }

.added-kicker,
.added-name,
.added-meta { margin: 0; }

.added-kicker,
.added-cart,
.added-variant,
.added-price {
  font-family: Silkscreen, ui-monospace, monospace;
  letter-spacing: 0.03em;
}

.added-kicker {
  font-size: 11px;
  text-transform: uppercase;
  color: #be5455;
}

[data-theme="dark"] .added-kicker { color: #f4c5cc; }

.added-name {
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.added-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  margin-top: 2px;
  font-size: 10px;
  color: #676b4f;
}

[data-theme="dark"] .added-meta { color: #f4c5cc; }

.added-variant {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.added-price {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
  color: inherit;
  white-space: nowrap;
}

.added-price img {
  width: 14px;
  height: 14px;
  flex: none;
  image-rendering: pixelated;
}

.added-cart {
  grid-column: 2;
  justify-self: start;
  font-size: 10px;
  text-transform: uppercase;
  color: #be5455;
  text-decoration: none;
}

.added-cart:hover { text-decoration: underline; text-decoration-thickness: 3px; }
[data-theme="dark"] .added-cart { color: #f4c5cc; }

.added-x {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.added-x:hover { border-color: currentColor; }
.added-x svg { width: 10px; height: 10px; shape-rendering: crispEdges; }

.added-x:focus-visible,
.added-cart:focus-visible {
  outline: 3px solid #c74375;
  outline-offset: 3px;
}

.added-life {
  position: absolute;
  inset-inline: 6px;
  bottom: 6px;
  display: flex;
  justify-content: flex-start;
  height: 6px;
}

.added-life i {
  flex: 0 0 calc((100% - 28px) / 8);
  min-width: 0;
  height: 100%;
  margin-inline-end: 4px;
  background: #f58684;
  overflow: hidden;
}

.added-life i:last-child { margin-inline-end: 0; }
[data-theme="dark"] .added-life i { background: #f4c5cc; }

.added-life[data-left="0"] i,
.added-life[data-left="1"] i:nth-child(n + 2),
.added-life[data-left="2"] i:nth-child(n + 3),
.added-life[data-left="3"] i:nth-child(n + 4),
.added-life[data-left="4"] i:nth-child(n + 5),
.added-life[data-left="5"] i:nth-child(n + 6),
.added-life[data-left="6"] i:nth-child(n + 7),
.added-life[data-left="7"] i:nth-child(n + 8) {
  opacity: 0;
  flex-basis: 0;
  margin-inline-end: 0;
}

@media (prefers-reduced-motion: reduce) {
  .added-toast { transition: none; }
}
</style>
