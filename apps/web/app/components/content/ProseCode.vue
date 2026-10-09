<template>
  <code
    class="inline-code relative rounded-md font-mono text-[0.875em] px-1.5 py-0.5 border bg-[var(--color-fire-500)]/10 border-[var(--color-fire-500)]/30 text-[var(--sr-accent-text)] dark:bg-[var(--color-fire-500)]/15 dark:border-[var(--color-fire-300)]/30 dark:text-[var(--sr-accent-text)] transition-colors"
  >
    <slot />
  </code>
</template>

<style scoped>
.inline-code:not(
    h1 > code,
    h1 > a > code,
    h2 > a > code,
    h3 > a > code,
    h4 > a > code,
    h5 > a > code,
    strong > a > code
  ) {
  /* text-sm */
  font-size: 0.875rem;
  line-height: 1.25rem;
}
</style>
