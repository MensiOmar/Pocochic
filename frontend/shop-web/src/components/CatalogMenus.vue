<script setup lang="ts">
import type { Locale, StyleListItem } from "@pocochic/contracts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import {
  categoryLabel,
  countCategory,
  countSection,
  leavesOf,
  SECTIONS,
  sectionLabel,
} from "../catalog-filters";
import { t } from "../i18n";
import "../catalog-filters.css";
import ArcadeKey from "./ArcadeKey.vue";

const props = defineProps<{
  locale: Locale;
  items: StyleListItem[];
  section: string;
  category: string;
}>();

const emit = defineEmits<{
  section: [slug: string];
  category: [slug: string];
}>();

const root = ref<HTMLElement | null>(null);
const open = ref<"" | "section" | "category">("");
const sectionList = ref<HTMLElement | null>(null);
const categoryList = ref<HTMLElement | null>(null);

const sectionName = computed(() => {
  const key = sectionLabel(props.section);
  return key ? t(props.locale, key) : t(props.locale, "section");
});
const categoryName = computed(() => {
  const key = categoryLabel(props.section, props.category);
  return key ? t(props.locale, key) : t(props.locale, "category");
});

const sectionRows = computed(() => [
  { slug: "", label: t(props.locale, "allSections"), count: props.items.length, selected: props.section === "" },
  ...SECTIONS.map((section) => ({
    slug: section.slug,
    label: t(props.locale, section.label),
    count: countSection(props.items, section.slug),
    selected: props.section === section.slug,
  })),
]);

const categoryRows = computed(() => [
  {
    slug: "",
    label: t(props.locale, "allCategories"),
    count: props.section ? countSection(props.items, props.section) : 0,
    selected: props.section !== "" && props.category === "",
  },
  ...leavesOf(props.section).map(([slug, label]) => ({
    slug,
    label: t(props.locale, label),
    count: countCategory(props.items, props.section, slug),
    selected: props.category === slug,
  })),
]);

function listEl(which: "section" | "category") {
  return which === "section" ? sectionList.value : categoryList.value;
}

async function toggle(which: "section" | "category") {
  if (which === "category" && !props.section) return;
  open.value = open.value === which ? "" : which;
  if (!open.value) return;
  await nextTick();
  const list = listEl(which);
  const selected = list?.querySelector<HTMLElement>('[aria-selected="true"]');
  (selected ?? list?.querySelector<HTMLElement>("button"))?.focus();
}

function chooseSection(slug: string) {
  open.value = "";
  emit("section", slug);
}

function chooseCategory(slug: string) {
  open.value = "";
  emit("category", slug);
}

function onKey(event: KeyboardEvent, which: "section" | "category") {
  const list = listEl(which);
  if (!list) return;
  const buttons = [...list.querySelectorAll<HTMLButtonElement>("button")];
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : -1;
    const next = buttons[(index + step + buttons.length) % buttons.length];
    next?.focus();
  } else if (event.key === "Home") {
    event.preventDefault();
    buttons[0]?.focus();
  } else if (event.key === "End") {
    event.preventDefault();
    buttons[buttons.length - 1]?.focus();
  }
}

function onPointer(event: PointerEvent) {
  if (!open.value) return;
  const target = event.target;
  if (target instanceof Node && root.value?.contains(target)) return;
  open.value = "";
}

function onEscape(event: KeyboardEvent) {
  if (event.key === "Escape") open.value = "";
}

watch(() => props.section, (section) => {
  if (!section) open.value = open.value === "category" ? "" : open.value;
});

onMounted(() => {
  document.addEventListener("pointerdown", onPointer);
  document.addEventListener("keydown", onEscape);
});
onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", onPointer);
  document.removeEventListener("keydown", onEscape);
});
</script>

<template>
  <div ref="root" class="catalog-filters">
    <div class="catalog-drop" :class="{ 'is-open': open === 'section' }">
      <ArcadeKey
        variant="choice"
        chip
        block
        :state="section ? 'on' : 'off'"
        aria-haspopup="listbox"
        aria-controls="section-menu"
        :aria-expanded="open === 'section'"
        @click="toggle('section')"
      >
        <span class="catalog-drop-label">
          <span class="catalog-drop-copy">{{ sectionName }}</span>
          <svg class="catalog-chev" viewBox="0 0 7 4" aria-hidden="true">
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
        v-if="open === 'section'"
        id="section-menu"
        ref="sectionList"
        class="catalog-menu"
        role="listbox"
        :aria-label="t(locale, 'section')"
        @keydown="onKey($event, 'section')"
      >
        <button
          v-for="row in sectionRows"
          :key="row.slug || 'all'"
          type="button"
          class="catalog-opt"
          role="option"
          :class="{ 'is-on': row.selected }"
          :aria-selected="row.selected"
          @click="chooseSection(row.slug)"
        >
          <span>{{ row.label }}</span>
          <span class="catalog-count">{{ row.count }}</span>
        </button>
      </div>
    </div>
    <div class="catalog-drop" :class="{ 'is-open': open === 'category' }">
      <ArcadeKey
        variant="choice"
        chip
        block
        :state="category ? 'on' : 'off'"
        :disabled="!section"
        aria-haspopup="listbox"
        aria-controls="category-menu"
        :aria-expanded="open === 'category'"
        @click="toggle('category')"
      >
        <span class="catalog-drop-label">
          <span class="catalog-drop-copy">{{ categoryName }}</span>
          <svg class="catalog-chev" viewBox="0 0 7 4" aria-hidden="true">
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
        v-if="open === 'category'"
        id="category-menu"
        ref="categoryList"
        class="catalog-menu"
        role="listbox"
        :aria-label="t(locale, 'category')"
        @keydown="onKey($event, 'category')"
      >
        <button
          v-for="row in categoryRows"
          :key="row.slug || 'all'"
          type="button"
          class="catalog-opt"
          role="option"
          :class="{ 'is-on': row.selected }"
          :aria-selected="row.selected"
          @click="chooseCategory(row.slug)"
        >
          <span>{{ row.label }}</span>
          <span class="catalog-count">{{ row.count }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
