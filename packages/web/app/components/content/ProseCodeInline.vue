<template>
  <code
    class="inline-code relative rounded-md font-mono text-[0.875em] px-1.5 py-0.5 border bg-[#f09237]/15 border-[#f09237]/50 text-[#9a3412] dark:bg-[#dd2c00]/12 dark:border-[#dd2c00]/80 dark:text-zinc-100 transition-colors"
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
