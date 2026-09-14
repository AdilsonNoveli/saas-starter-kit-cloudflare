<template>
  <LayoutSection>
    <div class="w-full text-center pb-8">
      <span class="text-3xl font-semibold text-highlighted">{{ title }}</span>
      <p v-if="subtitle" class="mt-2 text-muted">
        {{ subtitle }}
      </p>
    </div>
    <UAccordion
      :items="faqs ?? []"
      class="max-w-3xl mx-auto"
      :ui="{ root: 'divide-y divide-default' }"
    >
      <template #default="{ item, open }">
        <UButton
          color="neutral"
          variant="ghost"
          :ui="{
            base: 'rounded-none py-4 px-0 hover:bg-transparent dark:hover:bg-transparent',
          }"
        >
          <span class="truncate text-lg">{{ item.title }}</span>
          <template #trailing>
            <UIcon
              v-if="open"
              name="i-lucide-minus"
              class="w-5 h-5 ms-auto transform transition-transform duration-200"
            />
            <UIcon
              v-else
              name="i-lucide-plus"
              class="w-5 h-5 ms-auto transform transition-transform duration-200"
            />
          </template>
        </UButton>
      </template>
      <template #body="{ item }">
        <ContentRenderer :value="item" />
      </template>
    </UAccordion>
  </LayoutSection>
</template>

<script setup lang="ts">
const { data: faqs } = await useAsyncData("home", () =>
  queryCollection("faqs").all(),
);
defineProps({
  title: {
    type: String,
    default: "Your Questions, Answered",
  },
  subtitle: {
    type: String,
    default: "Everything you need to know about our SaaS",
  },
});
</script>
