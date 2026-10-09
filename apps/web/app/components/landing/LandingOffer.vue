<script setup lang="ts">
const { t } = useI18n();
const { whatsapp } = useOffer();

const repoUrl = "https://github.com/AdilsonNoveli/saas-starter-kit-cloudflare";
const kofiUrl = "https://ko-fi.com/s/2a7e86e811";

const included = ["source", "teams", "auth", "billing", "realtime", "admin", "kanban", "docs"];
const questions = ["needs", "commercial", "updates", "contact", "support", "pay"];
</script>

<template>
  <section id="offer" aria-labelledby="landing-offer" class="bg-elevated/40 scroll-mt-16">
    <div class="container mx-auto max-w-6xl px-4 md:px-8 py-20 md:py-28">
      <div class="mx-auto max-w-2xl text-center">
        <p class="text-sm font-semibold uppercase tracking-widest text-primary">{{ t("landing.offer.eyebrow") }}</p>
        <h2 id="landing-offer" class="mt-3 text-pretty text-4xl sm:text-5xl font-extrabold tracking-tight text-highlighted">
          {{ t("landing.offer.title") }}
        </h2>
      </div>

      <div class="pricing-card-animated mx-auto mt-14 max-w-6xl">
        <div class="rounded-[22px] bg-default p-6 sm:p-8 lg:p-12">
          <div class="grid gap-10 lg:grid-cols-12 lg:gap-12">
            <!-- Left Column: What's included in the kit -->
            <div class="lg:col-span-6">
              <h3 class="text-lg font-bold text-highlighted">
                {{ t("landing.offer.includedTitle") }}
              </h3>
              <ul class="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2 list-none p-0">
                <li v-for="item in included" :key="item" class="flex gap-3 text-base text-default">
                  <UIcon name="i-lucide-circle-check" class="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                  <span>{{ t(`landing.offer.included.${item}`) }}</span>
                </li>
              </ul>
              <p class="mt-8 text-sm leading-relaxed text-muted">
                {{ t("landing.offer.license") }}
                <NuxtLink to="/license" class="font-medium text-primary hover:underline">{{ t("landing.offer.licenseLink") }}</NuxtLink>
              </p>
            </div>

            <!-- Right Column: Open Source, Support & GitHub Star -->
            <div class="lg:col-span-6 lg:border-l lg:border-default lg:pl-10 flex flex-col justify-between">
              <div>
                <p class="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-success">
                  <span class="size-1.5 rounded-full bg-success" />
                  {{ t("landing.offer.badge") }}
                </p>
                <h3 class="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-highlighted">
                  {{ t("landing.offer.supportTitle") }}
                </h3>
                <p class="mt-3 text-sm sm:text-base leading-relaxed text-muted">
                  {{ t("landing.offer.supportText") }}
                </p>
              </div>

              <div class="mt-8 pt-6 border-t border-default flex flex-col gap-3">
                <div class="flex flex-col sm:flex-row items-center gap-3.5 w-full">
                  <!-- Botão Apoiar o projeto (verde vivo #00c951 com fonte escura, sem quebra de linha) -->
                  <a
                    :href="kofiUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="w-full sm:flex-1 inline-flex items-center justify-center gap-2 h-12 px-5 rounded-xl font-bold text-sm uppercase tracking-wider whitespace-nowrap bg-[#00c951] hover:bg-[#00df59] text-zinc-950 shadow-md shadow-[#00c951]/25 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0"
                  >
                    <UIcon name="i-lucide-heart" class="size-4 shrink-0 text-zinc-950" />
                    <span class="whitespace-nowrap">{{ t("landing.offer.supportCta") }}</span>
                  </a>

                  <!-- Botão Estrela no GitHub ao lado (sem quebra de linha) -->
                  <UButton
                    :href="repoUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    color="neutral"
                    variant="outline"
                    size="lg"
                    icon="i-lucide-github"
                    class="w-full sm:flex-1 h-12 justify-center rounded-xl font-bold uppercase tracking-wider text-sm whitespace-nowrap border-default hover:bg-elevated transition-colors shrink-0"
                  >
                    <span class="whitespace-nowrap">{{ t("landing.offer.githubCta") }}</span>
                  </UButton>
                </div>

                <p class="mt-1 text-xs text-muted text-center">
                  {{ t("landing.offer.supportMicrocopy") }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- WhatsApp Community & FAQ -->
      <div class="mx-auto mt-20 grid max-w-5xl gap-14 lg:grid-cols-12">
        <div class="lg:col-span-5">
          <h3 class="text-2xl font-bold text-highlighted">{{ t("landing.offer.talkTitle") }}</h3>
          <p class="mt-3 text-base leading-relaxed text-muted">{{ t("landing.offer.talkText") }}</p>
          <UButton
            :href="whatsapp(t('landing.offer.talkMessage'))"
            target="_blank"
            rel="noopener noreferrer"
            color="neutral"
            variant="outline"
            size="lg"
            icon="i-lucide-message-circle"
            class="mt-6 h-12 px-6 rounded-xl font-bold uppercase tracking-wider text-sm border-default hover:bg-elevated/80 transition-colors"
          >
            {{ t("landing.offer.talkCta") }}
          </UButton>
        </div>

        <div class="lg:col-span-7">
          <h3 class="text-2xl font-bold text-highlighted">{{ t("landing.faq.title") }}</h3>
          <div class="mt-6 divide-y divide-default border-y border-default">
            <details v-for="question in questions" :key="question" class="group py-4">
              <summary class="flex cursor-pointer list-none items-center justify-between gap-4 text-base sm:text-lg font-medium text-highlighted">
                <span>{{ t(`landing.faq.items.${question}.question`) }}</span>
                <UIcon name="i-lucide-plus" class="size-5 shrink-0 text-muted transition-transform group-open:rotate-45" aria-hidden="true" />
              </summary>
              <p class="mt-3 text-base leading-relaxed text-muted">
                {{ t(`landing.faq.items.${question}.answer`) }}
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
