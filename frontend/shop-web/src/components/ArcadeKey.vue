<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import "../arcade-key.css";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "icon" | "choice" | "back" | "text";
    hero?: boolean;
    block?: boolean;
    square?: boolean;
    chip?: boolean;
    plus?: boolean;
    /** Choice keys only. Omit it on steppers and arrows so they are not toggles. */
    state?: "on" | "off";
    disabled?: boolean;
    to?: string;
    type?: "button" | "submit";
    tone?: "link" | "danger";
    badge?: number;
  }>(),
  {
    variant: "primary",
    type: "button",
    tone: "link",
    badge: 0,
  },
);

const isLink = computed(() => Boolean(props.to));
const showCursor = computed(() => props.variant === "primary" || props.variant === "back" || props.variant === "text");
const rootClass = computed(() => [
  "px",
  props.variant === "icon" ? "px-icon" : "",
  props.variant === "choice" ? "px-choice" : "",
  props.variant === "back" ? "px-back" : "",
  props.variant === "text" ? "px-link" : "",
  props.variant === "text" && props.tone === "danger" ? "danger" : "",
  props.hero ? "px-hero" : "",
  props.block ? "px-block w-full" : "",
  props.square ? "px-square" : "",
  props.chip ? "px-chip" : "",
  props.state === "on" ? "is-on" : "",
]);
</script>

<template>
  <component
    :is="isLink ? RouterLink : 'button'"
    :class="rootClass"
    :to="isLink ? to : undefined"
    :type="isLink ? undefined : type"
    :disabled="isLink ? undefined : disabled || undefined"
    :aria-pressed="state === undefined ? undefined : state === 'on'"
  >
    <span class="face">
      <span v-if="showCursor" class="px-label">
        <span class="cursor" aria-hidden="true">
          <svg class="arrow" viewBox="0 0 4 7" aria-hidden="true">
            <rect x="0" y="0" width="1" height="1" fill="currentColor" />
            <rect x="0" y="1" width="2" height="1" fill="currentColor" />
            <rect x="0" y="2" width="3" height="1" fill="currentColor" />
            <rect x="0" y="3" width="4" height="1" fill="currentColor" />
            <rect x="0" y="4" width="3" height="1" fill="currentColor" />
            <rect x="0" y="5" width="2" height="1" fill="currentColor" />
            <rect x="0" y="6" width="1" height="1" fill="currentColor" />
          </svg>
        </span>
        <span class="px-copy"><slot /></span>
      </span>
      <span v-else-if="plus" class="plus"><slot /></span>
      <slot v-else />
    </span>
    <span v-if="badge > 0" class="px-badge">{{ badge }}</span>
  </component>
</template>
