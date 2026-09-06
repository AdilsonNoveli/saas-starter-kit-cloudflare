<template>
  <footer
    class="flex gap-1 lg:gap-0 flex-col lg:flex-row items-center justify-between py-3 px-4 sm:px-8 border-t border-zinc-200 dark:border-zinc-800/80 text-sm"
  >

    <div class="text-muted">© 2026 NuxFire</div>
    <nav class="flex space-x-4">
      <UButton
        to="/privacy-policy"
        variant="link"
        color="primary"
        size="sm"
        class="p-0"
      >
        Privacy
      </UButton>
      <UButton
        to="/terms-of-service"
        variant="link"
        color="primary"
        size="sm"
        class="p-0"
      >
        Terms
      </UButton>
      <UButton
        to="/license"
        variant="link"
        color="primary"
        size="sm"
        class="p-0"
      >
        License
      </UButton>
    </nav>
  </footer>
</template>

