<script setup lang="ts">
import { computed } from 'vue'
import type { OptionGroup } from '~~/shared/types/product'

/**
 * Step de texto livre (tipo `texto_livre`).
 * Textarea com placeholder do grupo, limite de caracteres e contador visual.
 * O contador fica laranja ao atingir 90 % do limite.
 */
const props = defineProps<{
  grupo: OptionGroup
  value: string
}>()

const emit = defineEmits<{
  'update:value': [v: string]
}>()

const maxChars = computed(() => props.grupo.texto_max_caracteres ?? null)
const charCount = computed(() => props.value.length)
const isNearLimit = computed(
  () => maxChars.value !== null && charCount.value >= maxChars.value * 0.9,
)
</script>

<template>
  <div class="p-5">
    <div class="relative">
      <textarea
        :value="value"
        rows="5"
        :maxlength="maxChars ?? undefined"
        :placeholder="grupo.texto_placeholder || 'Digite aqui...'"
        class="w-full px-4 py-3 rounded-md border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition-colors resize-none leading-relaxed"
        @input="emit('update:value', ($event.target as HTMLTextAreaElement).value)"
      />

      <!-- Contador de caracteres -->
      <span
        v-if="maxChars"
        class="absolute bottom-3 right-3 text-[10px] font-medium select-none transition-colors"
        :class="isNearLimit ? 'text-warning-600' : 'text-text-muted'"
        aria-live="polite"
        :aria-label="`${charCount} de ${maxChars} caracteres`"
      >
        {{ charCount }}/{{ maxChars }}
      </span>
    </div>
  </div>
</template>
