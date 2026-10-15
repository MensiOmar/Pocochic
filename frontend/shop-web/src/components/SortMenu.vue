<script setup lang="ts">
import type { Locale } from "@pocochic/contracts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { t } from "../i18n";
import type { SortId } from "../listing-order";
import ArcadeKey from "./ArcadeKey.vue";

const props = defineProps<{ locale: Locale; sort: SortId | null }>();
const emit = defineEmits<{ pick: [SortId] }>();

const root = ref<HTMLElement | null>(null);
const menuEl = ref<HTMLElement | null>(null);
const open = ref(false);

const groups = computed(() => [
  {
    label: t(props.locale, "sortName"),
    options: [
      { id: "az" as const, label: t(props.locale, "sortAz") },
      { id: "za" as const, label: t(props.locale, "sortZa") },
    ],
  },
  {
    label: t(props.locale, "sortPrice"),
    options: [
      { id: "cheap" as const, label: t(props.locale, "sortCheap") },
      { id: "pricey" as const, label: t(props.locale, "sortPricey") },
    ],
  },
]);

const label = computed(() => {
  if (props.sort === "az") return t(props.locale, "sortAz");
  if (props.sort === "za") return t(props.locale, "sortZa");
  if (props.sort === "cheap") return t(props.locale, "sortCheap");
  if (props.sort === "pricey") return t(props.locale, "sortPricey");
  return t(props.locale, "sortBy");
});

function focusButton() {
  root.value?.querySelector<HTMLElement>(".sort-key")?.focus();
}

function close(focus = false) {
  if (!open.value) return;
  open.value = false;
  if (focus) focusButton();
}

async function focusSelected() {
  await nextTick();
  const selected = menuEl.value?.querySelector<HTMLElement>('[aria-selected="true"]');
  const first = menuEl.value?.querySelector<HTMLElement>('[role="option"]');
  (selected ?? first)?.focus();
}

async function toggle() {
  open.value = !open.value;
  if (open.value) await focusSelected();
}

function pick(id: SortId) {
  open.value = false;
  emit("pick", id);
  focusButton();
}

function onButtonKey(event: KeyboardEvent) {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    if (!open.value) open.value = true;
    void focusSelected();
  }
  if (event.key === "Escape") {
    event.preventDefault();
    close(true);
  }
}

function onMenuKey(event: KeyboardEvent) {
  const options = [...(menuEl.value?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])];
  if (options.length === 0) return;
  if (event.key === "Escape") {
    event.preventDefault();
    close(true);
    return;
  }
  if (event.key === "Home") {
    event.preventDefault();
    options[0]?.focus();
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    options[options.length - 1]?.focus();
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  const index = options.indexOf(document.activeElement as HTMLButtonElement);
  const delta = event.key === "ArrowDown" ? 1 : -1;
  const start = index < 0 ? (delta === 1 ? -1 : 0) : index;
  options[(start + delta + options.length) % options.length]?.focus();
}

function onDocumentClick(event: MouseEvent) {
  if (!open.value) return;
  if (root.value?.contains(event.target as Node)) return;
  open.value = false;
}

function onDocumentKey(event: KeyboardEvent) {
  if (event.key === "Escape") close(true);
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onDocumentKey);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onDocumentKey);
});

defineExpose({
  close: () => close(false),
  faceEl: () => root.value?.querySelector<HTMLElement>(".face") ?? null,
});
</script>

<template>
  <div ref="root" class="sort-drop">
    <ArcadeKey
      variant="choice"
      chip
      class="sort-key"
      :state="sort ? 'on' : 'off'"
      :aria-expanded="open"
      aria-haspopup="listbox"
      aria-controls="catalog-sort-menu"
      @click="toggle"
      @keydown="onButtonKey"
    >
      <span class="sort-label">
        <span class="sort-copy">{{ label }}</span>
        <svg class="chev" :class="{ 'is-flipped': open }" viewBox="0 0 7 4" aria-hidden="true">
          <g fill="currentColor" shape-rendering="crispEdges">
            <rect x="0" y="0" width="1" height="1" />
            <rect x="6" y="0" width="1" height="1" />
            <rect x="1" y="1" width="1" height="1" />
            <rect x="5" y="1" width="1" height="1" />
            <rect x="2" y="2" width="1" height="1" />
            <rect x="4" y="2" width="1" height="1" />
            <rect x="3" y="3" width="1" height="1" />
          </g>
        </svg>
      </span>
    </ArcadeKey>
    <div
      v-show="open"
      id="catalog-sort-menu"
      ref="menuEl"
      class="sort-menu"
      role="listbox"
      :aria-label="t(locale, 'sortBy')"
      @keydown="onMenuKey"
    >
      <template v-for="group in groups" :key="group.label">
        <p class="col-label">{{ group.label }}</p>
        <button
          v-for="option in group.options"
          :key="option.id"
          type="button"
          class="sort-opt"
          :class="{ 'is-on': sort === option.id }"
          role="option"
          :aria-selected="sort === option.id"
          @click="pick(option.id)"
        >
          {{ option.label }}
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.sort-drop {
  position: relative;
  width: 210px;
  max-width: 100%;
}

.sort-key {
  width: 210px;
  max-width: 100%;
  flex-shrink: 0;
}

.sort-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  min-width: 0;
}

.sort-copy {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chev {
  display: block;
  flex: none;
  width: 14px;
  height: 8px;
  shape-rendering: crispEdges;
}

.chev.is-flipped {
  transform: scaleY(-1);
}

.sort-menu {
  position: absolute;
  z-index: 30;
  top: calc(100% - 4px);
  inset-inline-start: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: max-content;
  min-width: calc(100% - 10px);
  margin: 0;
  padding: 6px;
  background: #fffff9;
  border: 3px solid #0f1015;
  border-radius: 6px;
  box-shadow: 4px 4px 0 #f58684;
  color: #0f1015;
}

.col-label {
  margin: 6px 8px 2px;
  color: #676b4f;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.sort-menu .col-label:first-child {
  margin-top: 2px;
}

.sort-opt {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 36px;
  margin: 0;
  padding: 0 10px;
  border: 3px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  font-family: Silkscreen, ui-monospace, monospace;
  font-size: 11px;
  letter-spacing: 0.03em;
  line-height: 1.3;
  text-align: start;
  text-transform: uppercase;
  cursor: pointer;
}

.sort-opt:hover,
.sort-opt:focus-visible {
  border-color: #0f1015;
  background: #f4c5cc;
  color: #0f1015;
  outline: none;
}

.sort-opt.is-on,
.sort-opt.is-on:hover,
.sort-opt.is-on:focus-visible {
  border-color: #0f1015;
  background: #f58684;
  color: #0f1015;
}

[data-theme="dark"] .sort-menu {
  background: #351040;
  border-color: #f4c5cc;
  color: #fffff9;
  box-shadow: 4px 4px 0 #000;
}

[data-theme="dark"] .col-label {
  color: #f4c5cc;
}

[data-theme="dark"] .sort-opt:hover,
[data-theme="dark"] .sort-opt:focus-visible,
[data-theme="dark"] .sort-opt.is-on,
[data-theme="dark"] .sort-opt.is-on:hover,
[data-theme="dark"] .sort-opt.is-on:focus-visible {
  border-color: #f4c5cc;
  color: #0f1015;
}
</style>
