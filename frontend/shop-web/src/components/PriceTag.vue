<script setup lang="ts">
import { formatTnd } from "../money";
import { coinSrc } from "../theme";

defineProps<{ cents: number; large?: boolean; prominent?: boolean; plain?: boolean; compact?: boolean }>();
</script>

<template>
  <span
    dir="ltr"
    class="flex shrink-0 items-center font-heading font-bold"
    :class="[
      plain ? '' : 'text-primary',
      prominent ? 'gap-2 text-3xl' : large ? 'gap-1 text-xl' : compact ? 'gap-1 text-base' : 'gap-1 text-lg',
    ]"
  >
    {{ formatTnd(cents) }}
    <img :src="coinSrc" alt="" class="object-contain" :class="prominent ? 'h-7 w-7' : compact ? 'h-4 w-4' : 'h-5 w-5'" />
  </span>
</template>
