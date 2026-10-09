<script setup lang="ts">
const { t } = useI18n();
</script>

<template>
  <p class="text-center text-xs text-dimmed leading-relaxed pt-2">
    {{ t("auth.agreement.prefix") }}<br />
    <a
      href="/terms"
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary hover:text-primary/75 transition-colors underline underline-offset-4"
    >
      {{ t("auth.agreement.terms") }}
    </a>
    {{ t("auth.agreement.and") }}
    <a
      href="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      class="text-primary hover:text-primary/75 transition-colors underline underline-offset-4"
    >
      {{ t("auth.agreement.privacy") }}
    </a>.
  </p>
</template>
