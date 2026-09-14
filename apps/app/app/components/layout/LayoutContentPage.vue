<template>
  <LayoutSection>
    <ContentDoc v-slot="{ doc }">
      <article class="space-y-3">
        <div class="space-y-2">
          <span class="text-4xl font-semibold">{{ doc.title }}</span>
          <div v-if="type === 'blog'" class="flex gap-3 text-muted">
            <span v-if="doc.author">{{ doc.author }}</span>
            <span v-if="doc.date">{{ formatDate(doc.date) }}</span>
          </div>
          <slot />
        </div>
        <USeparator />
        <ContentRenderer :value="doc" />
      </article>
    </ContentDoc>
  </LayoutSection>
</template>

<script setup lang="ts">
const { type } = defineProps<{
  type?: string;
}>();
</script>
