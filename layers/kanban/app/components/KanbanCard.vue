<template>
  <UCard
    variant="subtle"
    :ui="{ body: 'p-3 sm:p-3' }"
    class="cursor-grab active:cursor-grabbing"
  >
    <div class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium truncate">
          {{ card.title }}
        </p>
        <p v-if="card.description" class="text-xs text-muted mt-1 line-clamp-3">
          {{ card.description }}
        </p>
      </div>

      <UButton
        icon="i-lucide-trash-2"
        color="neutral"
        variant="ghost"
        size="xs"
        square
        aria-label="Delete card"
        @click="emit('delete', card.id)"
      />
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { KanbanCardItem } from "../../shared/types";

defineProps<{ card: KanbanCardItem }>();

const emit = defineEmits<{ delete: [cardId: string] }>();
</script>
