<script setup lang="ts">
import type { Locale } from "@pocochic/contracts";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { t } from "../i18n";
import { commitBound, digitsOnly, shiftSpan, slideThumb, type Span } from "../listing-order";
import { coinSrc } from "../theme";

const props = defineProps<{
  locale: Locale;
  floor: number;
  ceil: number;
  min: number;
  max: number;
  lineWidth: number | null;
}>();

const emit = defineEmits<{ change: [Span] }>();

const nameEl = ref<HTMLElement | null>(null);
const trackEl = ref<HTMLElement | null>(null);
const readoutEl = ref<HTMLElement | null>(null);
const minInput = ref<HTMLInputElement | null>(null);
const maxInput = ref<HTMLInputElement | null>(null);
const minThumbEl = ref<HTMLElement | null>(null);
const lo = ref(props.min);
const hi = ref(props.max);
const minText = ref(String(props.min));
const maxText = ref(String(props.max));

let drag: { kind: "min" | "max" | "seg"; width: number; grab: number } | null = null;

const lineStyle = computed(() => (props.lineWidth == null ? undefined : { width: `${props.lineWidth}px` }));

const startPct = computed(() => {
  if (props.ceil === props.floor) return 0;
  return ((lo.value - props.floor) / (props.ceil - props.floor)) * 100;
});

const endPct = computed(() => {
  if (props.ceil === props.floor) return 100;
  return ((hi.value - props.floor) / (props.ceil - props.floor)) * 100;
});

const segmentStyle = computed(() => ({
  left: `${startPct.value}%`,
  right: `${100 - endPct.value}%`,
}));

function domain() {
  return { floor: props.floor, ceil: props.ceil };
}

function apply(next: Span) {
  if (next.min === lo.value && next.max === hi.value) return;
  lo.value = next.min;
  hi.value = next.max;
  if (document.activeElement !== minInput.value) minText.value = String(next.min);
  if (document.activeElement !== maxInput.value) maxText.value = String(next.max);
  emit("change", { min: next.min, max: next.max });
}

function valueFromX(clientX: number): number {
  const track = trackEl.value;
  if (!track || props.ceil === props.floor) return props.floor;
  const rect = track.getBoundingClientRect();
  const border = Number.parseFloat(getComputedStyle(track).borderLeftWidth) || 0;
  const left = rect.left + border;
  const width = rect.width - border * 2;
  const t = width <= 0 ? 0 : (clientX - left) / width;
  const raw = props.floor + Math.min(1, Math.max(0, t)) * (props.ceil - props.floor);
  return Math.round(raw);
}

function onPointerDown(event: PointerEvent) {
  if ((event.target as HTMLElement).closest("input")) return;
  const track = trackEl.value;
  if (!track) return;
  event.preventDefault();
  const thumb = (event.target as HTMLElement).closest<HTMLElement>(".thumb");
  const side = thumb?.dataset.side;
  const value = valueFromX(event.clientX);
  if (side === "min" || side === "max") {
    drag = { kind: side, width: 0, grab: 0 };
    apply(slideThumb(side, value, { min: lo.value, max: hi.value }, domain()));
  } else if ((event.target as HTMLElement).closest(".segment")) {
    drag = { kind: "seg", width: hi.value - lo.value, grab: value - lo.value };
  } else {
    const kind = Math.abs(value - lo.value) <= Math.abs(value - hi.value) ? "min" : "max";
    drag = { kind, width: 0, grab: 0 };
    apply(slideThumb(kind, value, { min: lo.value, max: hi.value }, domain()));
  }
  track.setPointerCapture?.(event.pointerId);
}

function onPointerMove(event: PointerEvent) {
  if (!drag) return;
  const value = valueFromX(event.clientX);
  const span = { min: lo.value, max: hi.value };
  if (drag.kind === "seg") apply(shiftSpan(value, drag.grab, drag.width, span, domain()));
  else apply(slideThumb(drag.kind, value, span, domain()));
}

function onPointerUp() {
  if (!drag) return;
  drag = null;
  emit("change", { min: lo.value, max: hi.value });
}

function onType(side: "min" | "max", event: Event) {
  const clean = digitsOnly((event.target as HTMLInputElement).value);
  if (side === "min") minText.value = clean;
  else maxText.value = clean;
  apply(commitBound(side, clean, { min: lo.value, max: hi.value }, domain(), "input"));
}

function onBlur(side: "min" | "max") {
  const draft = side === "min" ? minText.value : maxText.value;
  const next = commitBound(side, draft, { min: lo.value, max: hi.value }, domain(), "blur");
  if (side === "min") minText.value = String(next.min);
  else maxText.value = String(next.max);
  apply(next);
}

function onThumbKey(side: "min" | "max", event: KeyboardEvent) {
  const span = { min: lo.value, max: hi.value };
  const bounds = domain();
  const current = side === "min" ? lo.value : hi.value;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
    event.preventDefault();
    apply(slideThumb(side, current - 1, span, bounds));
  }
  if (event.key === "ArrowRight" || event.key === "ArrowUp") {
    event.preventDefault();
    apply(slideThumb(side, current + 1, span, bounds));
  }
  if (side === "min" && event.key === "Home") {
    event.preventDefault();
    apply(slideThumb("min", props.floor, span, bounds));
  }
  if (side === "max" && event.key === "End") {
    event.preventDefault();
    apply(slideThumb("max", props.ceil, span, bounds));
  }
}

function onEnter(event: KeyboardEvent) {
  (event.target as HTMLInputElement).blur();
}

/** Keep the fields between the thumbs, or beside them when the span is too narrow. */
function placeReadout() {
  const track = trackEl.value;
  const readout = readoutEl.value;
  const name = nameEl.value;
  if (!track || !readout) return;
  const border = Number.parseFloat(getComputedStyle(track).borderLeftWidth) || 0;
  const trackRect = track.getBoundingClientRect();
  const contentLeft = trackRect.left + border;
  const contentWidth = Math.max(0, trackRect.width - border * 2);
  const thumbW = minThumbEl.value?.offsetWidth || 12;
  const gap = 8;
  const start = startPct.value;
  const end = endPct.value;
  const leftInner = contentLeft + (start / 100) * contentWidth + thumbW / 2 + gap;
  const rightInner = contentLeft + (end / 100) * contentWidth - thumbW / 2 - gap;
  const readW = readout.offsetWidth;
  const trackEnd = trackRect.right - border - 2;
  const nameRect = name.getBoundingClientRect();
  let minLeft = contentLeft;
  let maxLeft = trackEnd - readW;
  if (nameRect.right <= contentLeft + 1) minLeft = Math.max(minLeft, nameRect.right + 10);
  if (nameRect.left >= trackRect.right - border - 1) maxLeft = Math.min(maxLeft, nameRect.left - 10 - readW);
  let left: number;
  if (rightInner - leftInner >= readW) {
    left = leftInner + (rightInner - leftInner - readW) / 2;
  } else {
    const rightOf = contentLeft + (end / 100) * contentWidth + thumbW / 2 + gap;
    const leftOf = contentLeft + (start / 100) * contentWidth - thumbW / 2 - gap - readW;
    if (rightOf + readW <= trackEnd && rightOf >= minLeft) left = rightOf;
    else if (leftOf >= minLeft) left = leftOf;
    else left = minLeft;
  }
  if (left < minLeft) left = minLeft;
  if (left > maxLeft) left = Math.max(minLeft, maxLeft);
  readout.style.left = `${Math.round(left - contentLeft)}px`;
}

watch(
  () => [props.min, props.max] as const,
  ([min, max]) => {
    if (drag) return;
    if (document.activeElement !== minInput.value) {
      lo.value = min;
      minText.value = String(min);
    }
    if (document.activeElement !== maxInput.value) {
      hi.value = max;
      maxText.value = String(max);
    }
  },
);

watch(
  () => [lo.value, hi.value, props.floor, props.ceil, props.lineWidth, minText.value, maxText.value],
  async () => {
    await nextTick();
    placeReadout();
  },
);

onMounted(() => {
  placeReadout();
  window.addEventListener("resize", placeReadout);
  document.fonts?.ready.then(() => placeReadout());
});

onBeforeUnmount(() => {
  window.removeEventListener("resize", placeReadout);
});
</script>

<template>
  <div class="price-line" :style="lineStyle">
    <span ref="nameEl" class="price-name">
      <img class="price-coin" :src="coinSrc" alt="" draggable="false" />
      {{ t(locale, "priceRange") }}
    </span>
    <div class="slider">
      <div
        ref="trackEl"
        class="track"
        dir="ltr"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <div class="segment" :style="segmentStyle"></div>
        <div ref="readoutEl" class="readout" dir="ltr">
          <input
            ref="minInput"
            :value="minText"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            spellcheck="false"
            dir="ltr"
            :aria-label="t(locale, 'minPrice')"
            @input="onType('min', $event)"
            @blur="onBlur('min')"
            @keydown.enter.prevent="onEnter"
          />
          <span class="seg-dash" aria-hidden="true"></span>
          <input
            ref="maxInput"
            :value="maxText"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            spellcheck="false"
            dir="ltr"
            :aria-label="t(locale, 'maxPrice')"
            @input="onType('max', $event)"
            @blur="onBlur('max')"
            @keydown.enter.prevent="onEnter"
          />
        </div>
        <button
          ref="minThumbEl"
          class="thumb"
          type="button"
          data-side="min"
          role="slider"
          aria-orientation="horizontal"
          :aria-label="t(locale, 'minPrice')"
          :aria-valuemin="floor"
          :aria-valuemax="ceil"
          :aria-valuenow="lo"
          :style="{ left: `${startPct}%` }"
          @keydown="onThumbKey('min', $event)"
        ></button>
        <button
          class="thumb"
          type="button"
          data-side="max"
          role="slider"
          aria-orientation="horizontal"
          :aria-label="t(locale, 'maxPrice')"
          :aria-valuemin="floor"
          :aria-valuemax="ceil"
          :aria-valuenow="hi"
          :style="{ left: `${endPct}%` }"
          @keydown="onThumbKey('max', $event)"
        ></button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.price-line {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.price-name {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex: none;
  color: #0f1015;
  font-family: Silkscreen, ui-monospace, monospace;
  font-size: 14px;
  letter-spacing: 0.03em;
  line-height: 1.2;
  text-transform: uppercase;
  white-space: nowrap;
}

.price-coin {
  width: 22px;
  height: 22px;
  flex: none;
  image-rendering: pixelated;
}

.slider {
  position: relative;
  flex: 1 1 auto;
  min-width: 120px;
  height: 36px;
}

.track {
  position: absolute;
  inset: 4px 8px;
  border: 3px solid #0f1015;
  border-radius: 6px;
  background: #f1e6dd;
  box-shadow: inset 0 3px 0 rgba(15, 16, 21, 0.16);
  touch-action: none;
  user-select: none;
}

.segment {
  position: absolute;
  z-index: 1;
  top: 0;
  bottom: 0;
  background: #f58684;
  cursor: grab;
}

.readout {
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
}

.readout input {
  position: relative;
  z-index: 3;
  width: 4.2ch;
  height: 20px;
  margin: 0;
  padding: 0 2px;
  border: 2px solid #0f1015;
  border-radius: 2px;
  background: #fffff9;
  color: #0f1015;
  caret-color: #c74375;
  box-shadow: inset 0 2px 0 rgba(15, 16, 21, 0.16);
  font-family: "JetBrains Mono", ui-monospace, monospace;
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
  text-align: center;
  outline: none;
  cursor: text;
  pointer-events: auto;
}

.readout input:hover,
.readout input:focus {
  background: #fff;
  border-color: #351040;
}

.seg-dash {
  flex: none;
  width: 6px;
  height: 2px;
  background: #0f1015;
}

.thumb {
  position: absolute;
  z-index: 4;
  top: 50%;
  width: 12px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: 2px solid #0f1015;
  border-radius: 2px;
  background: #fffff9;
  box-shadow: 2px 2px 0 #0f1015;
  transform: translate(-50%, -50%);
  cursor: grab;
  touch-action: none;
  appearance: none;
}

.thumb::before {
  content: "";
  position: absolute;
  left: 3px;
  top: 4px;
  bottom: 4px;
  width: 2px;
  background: #0f1015;
}

.thumb:focus-visible {
  outline: 2px solid #0f1015;
  outline-offset: 2px;
}

.thumb:active,
.segment:active {
  cursor: grabbing;
}

[data-theme="dark"] .price-name {
  color: #f4c5cc;
}

[data-theme="dark"] .track {
  border-color: #f4c5cc;
  background: #000;
  box-shadow: inset 0 3px 0 #000;
}

[data-theme="dark"] .readout input {
  border-color: #0f1015;
  background: #fffff9;
  color: #0f1015;
}

[data-theme="dark"] .readout input:hover,
[data-theme="dark"] .readout input:focus {
  background: #fff;
  border-color: #c74375;
}

[data-theme="dark"] .thumb {
  border-color: #f4c5cc;
  background: #fffff9;
  box-shadow: 2px 2px 0 #000;
  transform: translate(-50%, -50%);
}

[data-theme="dark"] .thumb:focus-visible {
  outline-color: #f4c5cc;
}
</style>
