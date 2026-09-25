<script setup lang="ts">
const { t } = useI18n();
const pieces = ["auth", "teams", "permissions", "billing", "emails", "queues", "admin", "deploy"];
</script>

<template>
  <section aria-labelledby="landing-problem" class="border-y border-default bg-elevated/40">
    <div class="container mx-auto max-w-4xl px-4 md:px-8 py-20 md:py-28 text-center">
      <h2 id="landing-problem" class="text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
        {{ t("landing.problem.title") }}
      </h2>
      <ul class="mt-10 flex flex-wrap justify-center gap-3 list-none p-0">
        <li
          v-for="piece in pieces"
          :key="piece"
          class="rounded-full border border-default bg-default px-4 py-2 text-sm font-medium text-default"
        >
          {{ t(`landing.problem.pieces.${piece}`) }}
        </li>
      </ul>
      <p class="mx-auto mt-10 max-w-2xl text-lg sm:text-xl leading-relaxed text-muted">
        {{ t("landing.problem.body") }}
      </p>
    </div>
  </section>
</template>
