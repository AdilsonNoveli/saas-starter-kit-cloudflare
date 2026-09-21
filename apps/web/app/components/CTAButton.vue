<template>
  <NuxtLink
    :to="to"
    :href="href"
    :target="target"
    :class="[
      'group inline-flex items-center justify-center font-bold uppercase tracking-wider select-none cursor-pointer',
      isShiny
        ? (color === 'green' ? 'shiny-button shiny-button-green' : 'shiny-button')
        : (color === 'green' ? 'bg-success hover:bg-success/90 text-white duration-200 active:scale-95 shadow-sm' : 'bg-[var(--color-brand)] hover:bg-[var(--color-brand-hover)] text-white duration-200 active:scale-95 shadow-sm'),
      sizeClasses,
      radiusClasses,
      widthClasses,
    ]"
  >
    <!-- The direct span is required for the shiny effect to work correctly -->
    <span class="flex items-center justify-center gap-2">
      <slot name="leading">
        <UIcon v-if="leadingIcon" :name="leadingIcon" class="w-4 h-4 shrink-0" />
      </slot>
      <slot />
      <slot name="trailing">
        <UIcon
          v-if="trailingIcon"
          :name="trailingIcon"
          class="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
        />
      </slot>
    </span>
  </NuxtLink>
</template>

<script setup lang="ts">
interface Props {
  to?: string;
  href?: string;
  target?: "_blank" | "_self";
  variant?: "shiny" | "solid";
  color?: "green" | "brand";
  size?: "sm" | "md" | "lg" | "xl";
  radius?: "md" | "lg" | "xl";
  shadow?: "none" | "sm" | "md";
  fullWidthMobile?: boolean;
  block?: boolean;
  leadingIcon?: string;
  trailingIcon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  to: undefined,
  href: undefined,
  target: undefined,
  variant: "shiny",
  color: "green",
  size: "md",
  radius: "lg",
  shadow: "sm",
  fullWidthMobile: false,
  block: false,
  leadingIcon: undefined,
  trailingIcon: undefined,
});

const isShiny = computed(() => props.variant === "shiny");

const sizeClasses = computed(() => {
  switch (props.size) {
    case "sm":
      return "px-4 py-2 text-xs";
    case "md":
      return "px-8 py-3.5 text-sm";
    case "lg":
      return "px-10 py-4 text-base";
    case "xl":
      return "px-12 py-4.5 text-lg";
    default:
      return "px-8 py-3.5 text-sm";
  }
});

const radiusClasses = computed(() => {
  switch (props.radius) {
    case "md":
      return "rounded-lg";
    case "xl":
      return "rounded-2xl";
    case "lg":
    default:
      return "rounded-xl";
  }
});

const shadowClasses = computed(() => {
  switch (props.shadow) {
    case "none":
      return "";
    case "md":
      return "shadow-md shadow-secondary/20";
    case "sm":
    default:
      return "shadow-sm";
  }
});

const widthClasses = computed(() => {
  if (props.block) return "w-full";
  if (props.fullWidthMobile) return "w-full md:w-auto";
  return "";
});
</script>
