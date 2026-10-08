<script setup lang="ts">
import { useId } from "vue";

defineProps<{ code: "fr" | "ar" | "en" }>();

const clipId = useId();
</script>

<template>
  <svg v-if="code === 'fr'" class="player-flag player-flag-fr" viewBox="0 0 3 2" aria-hidden="true">
    <rect width="1" height="2" fill="#0055A4" />
    <rect x="1" width="1" height="2" fill="#FFFFFF" />
    <rect x="2" width="1" height="2" fill="#EF4135" />
  </svg>
  <svg v-else-if="code === 'ar'" class="player-flag player-flag-ar" viewBox="0 0 120 80" aria-hidden="true">
    <rect width="120" height="80" fill="#E70013" />
    <circle cx="60" cy="40" r="26" fill="#FFFFFF" />
    <circle cx="60" cy="40" r="20" fill="#E70013" />
    <circle cx="70" cy="40" r="16" fill="#FFFFFF" />
    <polygon points="72.0,27.5 74.9,36.0 83.9,36.1 76.8,41.5 79.3,50.1 72.0,45.0 64.7,50.1 67.2,41.5 60.1,36.1 69.1,36.0" fill="#E70013" />
  </svg>
  <svg v-else class="player-flag player-flag-en" viewBox="7.5 0 45 30" aria-hidden="true">
    <defs>
      <clipPath :id="`${clipId}-s`"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
      <clipPath :id="`${clipId}-t`"><path d="M30,15 h30 v15 z v-15 h-30 z h-30 v-15 z v15 h30 z" /></clipPath>
    </defs>
    <g :clip-path="`url(#${clipId}-s)`">
      <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
      <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" stroke-width="6" />
      <path d="M0,0 L60,30 M60,0 L0,30" :clip-path="`url(#${clipId}-t)`" stroke="#C8102E" stroke-width="4" />
      <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" stroke-width="10" />
      <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6" />
    </g>
  </svg>
</template>
