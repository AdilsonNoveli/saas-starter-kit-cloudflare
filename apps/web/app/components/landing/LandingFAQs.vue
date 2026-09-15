<template>
  <LayoutSection>
    <div class="w-full text-center pb-8">
      <span class="text-3xl font-semibold text-highlighted">{{ heading }}</span>
      <p v-if="subheading" class="mt-2 text-muted">
        {{ subheading }}
      </p>
    </div>
    <UAccordion
      :items="faqItems"
      class="max-w-3xl mx-auto"
      :ui="{ root: 'divide-y divide-default' }"
    >
      <template #default="{ item, open }">
        <UButton
          color="neutral"
          variant="ghost"
          :ui="{
            base: 'rounded-none py-4 px-0 hover:bg-transparent dark:hover:bg-transparent text-left w-full justify-between items-center',
          }"
        >
          <span class="text-left text-base sm:text-lg font-medium text-highlighted flex-1 pr-4 leading-snug">
            {{ item.label }}
          </span>
          <template #trailing>
            <UIcon
              v-if="open"
              name="i-lucide-minus"
              class="w-5 h-5 ms-auto transform transition-transform duration-200 shrink-0 text-muted"
            />
            <UIcon
              v-else
              name="i-lucide-plus"
              class="w-5 h-5 ms-auto transform transition-transform duration-200 shrink-0 text-muted"
            />
          </template>
        </UButton>
      </template>
      <template #body="{ item }">
        <div class="pb-6 text-muted text-sm sm:text-base leading-relaxed whitespace-pre-line">
          {{ item.content }}
        </div>
      </template>
    </UAccordion>
  </LayoutSection>
</template>

<script setup lang="ts">
const props = defineProps<{
  title?: string;
  subtitle?: string;
}>();

const { t } = useI18n();
const heading = computed(() => props.title ?? t("landing.faqs.title"));
const subheading = computed(() => props.subtitle ?? t("landing.faqs.subtitle"));

const faqItems = computed(() => [
  {
    label: t("landing.faqs.items.item1.question"),
    content: t("landing.faqs.items.item1.answer"),
  },
  {
    label: t("landing.faqs.items.item2.question"),
    content: t("landing.faqs.items.item2.answer"),
  },
  {
    label: t("landing.faqs.items.item3.question"),
    content: t("landing.faqs.items.item3.answer"),
  },
  {
    label: t("landing.faqs.items.item4.question"),
    content: t("landing.faqs.items.item4.answer"),
  },
  {
    label: t("landing.faqs.items.item5.question"),
    content: t("landing.faqs.items.item5.answer"),
  },
  {
    label: t("landing.faqs.items.item6.question"),
    content: t("landing.faqs.items.item6.answer"),
  },
  {
    label: t("landing.faqs.items.item7.question"),
    content: t("landing.faqs.items.item7.answer"),
  },
]);
</script>
