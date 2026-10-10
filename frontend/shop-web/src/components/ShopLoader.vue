<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { heartPhase, LOADER_HEARTS, LOADER_TICK_MS, loaderSteps, loaderValueNow, REDUCED_MOTION_STEPS } from "../loader";
import { brandAssets, themeMode } from "../theme";

const logo = computed(() => brandAssets[themeMode.value].logo);
const steps = ref(0);
const valueNow = computed(() => loaderValueNow(steps.value));
let timer = 0;
let tick = 0;

function heartClass(index: number) {
  const phase = heartPhase(steps.value, index);
  if (phase === "full") return "is-on";
  if (phase === "half") return "is-half";
  return "";
}

onMounted(() => {
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  if (reduce) {
    steps.value = REDUCED_MOTION_STEPS;
    return;
  }
  timer = window.setInterval(() => {
    steps.value = loaderSteps(tick);
    tick += 1;
  }, LOADER_TICK_MS);
});

onBeforeUnmount(() => {
  window.clearInterval(timer);
});
</script>

<template>
  <div class="loader-stage">
    <div class="loader-stack">
      <img class="loader-logo" :src="logo" alt="Pocochic" />
      <p class="loader-slogan">setting the right tune</p>
      <div
        class="loader-hearts"
        role="progressbar"
        aria-label="Loading"
        aria-valuemin="0"
        aria-valuemax="10"
        :aria-valuenow="valueNow"
      >
        <svg
          v-for="index in LOADER_HEARTS"
          :key="index"
          class="loader-heart"
          :class="heartClass(index - 1)"
          viewBox="0 0 16 14"
          aria-hidden="true"
        >
          <g class="line">
            <rect x="2" y="0" width="4" height="1" /><rect x="10" y="0" width="4" height="1" />
            <rect x="1" y="1" width="2" height="1" /><rect x="5" y="1" width="2" height="1" />
            <rect x="9" y="1" width="2" height="1" /><rect x="13" y="1" width="2" height="1" />
            <rect x="0" y="2" width="2" height="1" /><rect x="6" y="2" width="4" height="1" /><rect x="14" y="2" width="2" height="1" />
            <rect x="0" y="3" width="1" height="1" /><rect x="15" y="3" width="1" height="1" />
            <rect x="0" y="4" width="1" height="1" /><rect x="15" y="4" width="1" height="1" />
            <rect x="0" y="5" width="2" height="1" /><rect x="14" y="5" width="2" height="1" />
            <rect x="1" y="6" width="2" height="1" /><rect x="13" y="6" width="2" height="1" />
            <rect x="2" y="7" width="2" height="1" /><rect x="12" y="7" width="2" height="1" />
            <rect x="3" y="8" width="2" height="1" /><rect x="11" y="8" width="2" height="1" />
            <rect x="4" y="9" width="2" height="1" /><rect x="10" y="9" width="2" height="1" />
            <rect x="5" y="10" width="2" height="1" /><rect x="9" y="10" width="2" height="1" />
            <rect x="6" y="11" width="4" height="1" /><rect x="7" y="12" width="2" height="1" />
          </g>
          <g class="pad">
            <rect x="3" y="1" width="2" height="1" /><rect x="11" y="1" width="2" height="1" />
            <rect x="2" y="2" width="4" height="1" /><rect x="10" y="2" width="4" height="1" />
            <rect x="1" y="3" width="3" height="1" /><rect x="4" y="3" width="11" height="1" />
            <rect x="1" y="4" width="2" height="1" /><rect x="3" y="4" width="12" height="1" />
            <rect x="2" y="5" width="12" height="1" /><rect x="3" y="6" width="10" height="1" />
            <rect x="4" y="7" width="8" height="1" /><rect x="5" y="8" width="6" height="1" />
            <rect x="6" y="9" width="4" height="1" /><rect x="7" y="10" width="2" height="1" />
          </g>
          <g class="ink">
            <rect x="3" y="1" width="2" height="1" /><rect x="11" y="1" width="2" height="1" />
            <rect x="2" y="2" width="4" height="1" /><rect x="10" y="2" width="4" height="1" />
            <rect x="1" y="3" width="3" height="1" /><rect x="4" y="3" width="11" height="1" />
            <rect x="1" y="4" width="2" height="1" /><rect x="3" y="4" width="12" height="1" />
            <rect x="2" y="5" width="12" height="1" /><rect x="3" y="6" width="10" height="1" />
            <rect x="4" y="7" width="8" height="1" /><rect x="5" y="8" width="6" height="1" />
            <rect x="6" y="9" width="4" height="1" /><rect x="7" y="10" width="2" height="1" />
          </g>
          <g class="shine">
            <rect x="2" y="3" width="2" height="1" /><rect x="2" y="4" width="1" height="1" />
          </g>
        </svg>
      </div>
    </div>
  </div>
</template>

<style>
.loader-stage {
  flex: 1;
  display: grid;
  place-items: center;
  width: 100%;
  padding: 28px 16px 40px;
}

.loader-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.loader-logo {
  width: min(78vw, 430px);
  height: auto;
  display: block;
}

.loader-slogan {
  margin: 22px 0 0;
  font-family: Silkscreen, ui-monospace, monospace;
  font-size: clamp(15px, 2.4vw, 20px);
  font-weight: 400;
  letter-spacing: 0.04em;
  line-height: 1.4;
  color: #8ba684;
  text-align: center;
}

[data-theme="dark"] .loader-slogan {
  color: #f4c5cc;
}

.loader-hearts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  direction: ltr;
  gap: 8px;
  margin-top: 28px;
  max-width: 460px;
}

.loader-heart {
  width: 34px;
  height: auto;
  display: block;
  shape-rendering: crispEdges;
}

.loader-heart .line { fill: #0f1015; }
.loader-heart .pad { fill: #fffff9; }
.loader-heart .ink { fill: #e02020; clip-path: inset(0 100% 0 0); }
.loader-heart .shine { fill: #ffd6d6; opacity: 0; }

.loader-heart.is-half .ink { clip-path: inset(0 50% 0 0); }
.loader-heart.is-on .ink { clip-path: none; }
.loader-heart.is-on .shine { opacity: 1; }

[data-theme="dark"] .loader-heart .line { fill: #f4c5cc; }
[data-theme="dark"] .loader-heart .pad { fill: #000000; }

@media (max-width: 520px) {
  .loader-hearts { gap: 6px; max-width: 320px; margin-top: 22px; }
  .loader-heart { width: 26px; }
  .loader-slogan { margin-top: 16px; }
}
</style>
