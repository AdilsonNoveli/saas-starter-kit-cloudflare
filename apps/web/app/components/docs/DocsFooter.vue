<template>
  <footer
    class="flex gap-1 lg:gap-0 flex-col lg:flex-row items-center justify-between py-3 px-4 sm:px-8 border-t border-default text-sm"
  >

    <div class="text-muted">{{ $t("docs.footer.copyright", { year: currentYear }) }}</div>
    <nav class="flex space-x-4">
      <UButton
        :to="localePath('/privacy-policy')"
        variant="link"
        color="primary"
        size="sm"
        class="p-0"
      >
        {{ $t("docs.footer.privacy") }}
      </UButton>
      <UButton
        :to="localePath('/terms-of-service')"
        variant="link"
        color="primary"
        size="sm"
        class="p-0"
      >
        {{ $t("docs.footer.terms") }}
      </UButton>
      <UButton
        :to="localePath('/license')"
        variant="link"
        color="primary"
        size="sm"
        class="p-0"
      >
        {{ $t("footer.legal.license") }}
      </UButton>
    </nav>
  </footer>
</template>

<script setup lang="ts">
// "Privacy"/"Terms" are the short docs-chrome variants of the site footer's
// full "Privacy Policy"/"Terms of Service", so they get their own keys — but
// "License" is the same word in both places and reuses `footer.legal.license`
// rather than duplicating a key.
const localePath = useLocalePath();
const currentYear = new Date().getFullYear();
</script>
