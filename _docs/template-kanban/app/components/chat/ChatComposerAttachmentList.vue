<!--
  @descricao: Lista de anexos pendentes na caixa de mensagem antes do envio.
  @responsabilidade: Exibir miniaturas com botão de remover.
-->

<script setup lang="ts">
import { X } from '@lucide/vue'

export interface PendingAttachment {
  readonly url: string
  readonly key: string
  readonly fileName: string
  readonly mimeType: string
  readonly fileSize: number
}

defineProps<{
  readonly attachments: readonly PendingAttachment[]
}>()

const emit = defineEmits<{
  remove: [index: number]
}>()
</script>

<template>
  <div
    v-if="attachments.length > 0"
    class="flex items-center gap-2 p-2.5 mb-2 bg-surface-raised rounded-xl border border-border overflow-x-auto select-none"
  >
    <div
      v-for="(att, idx) in attachments"
      :key="att.key"
      class="relative w-16 h-16 rounded-lg overflow-hidden border border-border shrink-0 group shadow-2xs"
    >
      <img :src="att.url" :alt="att.fileName" class="w-full h-full object-cover">
      <button
        type="button"
        class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer hover:bg-black transition-colors"
        title="Remover anexo"
        @click="emit('remove', idx)"
      >
        <X class="w-3 h-3" />
      </button>
    </div>
  </div>
</template>
