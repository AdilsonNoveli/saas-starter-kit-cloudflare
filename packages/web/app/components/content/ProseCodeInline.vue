<template>
  <code
    class="inline-code relative rounded-md font-mono text-[0.875em] px-1.5 py-0.5 border bg-[var(--color-fire-500)]/15 border-[var(--color-fire-500)]/50 text-[#9a3412] dark:bg-[var(--color-flame-700)]/12 dark:border-[var(--color-flame-700)]/80 dark:text-highlighted transition-colors"
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
