<script setup lang="ts">
const { t } = useI18n();
const pieces = ["auth", "teams", "permissions", "billing", "emails", "queues", "admin", "deploy"];

const titleParts = computed(() => {
  const full = t("landing.problem.title");
  const splitIndex = full.indexOf(". ");
  if (splitIndex === -1) return [full, ""];
  return [full.slice(0, splitIndex + 1), full.slice(splitIndex + 2)];
});
</script>

<template>
  <section aria-labelledby="landing-problem" class="bg-elevated/40">
    <div class="container mx-auto max-w-4xl px-4 md:px-8 py-20 md:py-28 text-center flex flex-col items-center">
      <h2 id="landing-problem" class="text-pretty text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12] text-highlighted">
        <span class="block">{{ titleParts[0] }}</span>
        <span class="block text-muted">{{ titleParts[1] }}</span>
      </h2>

      <!-- Visual tags model applied directly to the 8 problem pieces -->
      <div class="relative mt-12 w-full max-w-3xl">
        <div class="flex flex-wrap justify-center items-center gap-2.5 sm:gap-3 list-none p-0">
          <span
            v-for="piece in pieces"
            :key="piece"
            class="inline-flex items-center gap-2 rounded-xl border border-default bg-elevated/90 px-4 py-2 text-sm sm:text-base font-medium text-muted transition-colors hover:border-accented hover:text-highlighted shadow-xs"
          >
            <UIcon name="i-lucide-circle-check" class="size-4 sm:size-5 shrink-0 text-success" aria-hidden="true" />
            <span>{{ t(`landing.problem.pieces.${piece}`) }}</span>
          </span>
        </div>
      </div>

      <p class="mx-auto mt-10 max-w-2xl text-lg sm:text-xl leading-relaxed text-muted">
        {{ t("landing.problem.body") }}
      </p>
    </div>
  </section>
</template>
