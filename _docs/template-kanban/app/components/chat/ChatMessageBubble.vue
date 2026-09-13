<!--
  @descricao: Bolha de mensagem individual com formato idêntico ao WhatsApp Web.
  @responsabilidade: Renderização com cauda integrada (tail com borda contínua), timestamp inline, anexos S3 e cores do design system.
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatMessage } from '#shared/types/chat'
import ChatMessageBubbleTail from './ChatMessageBubbleTail.vue'
import {
  Mic,
  Camera,
  Bot,
  User,
  Check,
  CheckCheck,
  Clock,
  AlertTriangle,
  ToolCase,
} from '@lucide/vue'

const props = defineProps<{
  readonly message: ChatMessage
}>()

const emit = defineEmits<{
  (e: 'previewImage', url: string, name?: string): void
}>()

const isUser = computed<boolean>(() => props.message.role === 'user')

const formattedTime = computed<string>(() => {
  if (!props.message.criadoEm) return ''
  const date = new Date(props.message.criadoEm)
  if (isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
})
</script>

<template>
  <div
    class="flex flex-col w-full my-1.5"
    :class="isUser ? 'items-start pl-3' : 'items-end pr-3'"
  >
    <div
      class="max-w-[85%] sm:max-w-[70%] md:max-w-[62%] px-3 py-1.5 shadow-[0_1px_0.5px_rgba(0,0,0,0.08)] relative text-sm select-text transition-all"
      :class="[
        isUser
          ? 'bg-surface border border-border text-text-primary rounded-lg rounded-tl-none'
          : message.isFromStaff
            ? 'bg-blue-50 dark:bg-[#0c1e38] border border-blue-200 dark:border-blue-800/70 text-text-primary rounded-lg rounded-tr-none'
            : 'bg-emerald-50 dark:bg-[#062c1d] border border-emerald-200 dark:border-emerald-800/70 text-text-primary rounded-lg rounded-tr-none',
      ]"
    >
      <!-- Cauda Integrada com Borda Contínua (WhatsApp Tail) -->
      <ChatMessageBubbleTail
        :direction="isUser ? 'left' : 'right'"
        :variant="isUser ? 'client' : message.isFromStaff ? 'staff' : 'agent'"
      />

      <!-- Etiqueta de Autoria (para respostas da loja / Agente) -->
      <div
        v-if="!isUser"
        class="flex items-center gap-1 text-[11px] font-semibold mb-0.5 select-none"
        :class="message.isFromStaff ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-700 dark:text-emerald-300'"
      >
        <User v-if="message.isFromStaff" class="w-3 h-3 shrink-0" />
        <Bot v-else class="w-3 h-3 shrink-0" />
        <span>{{ message.isFromStaff ? (message.staffName || 'Atendente (Loja)') : 'Agente IA' }}</span>
      </div>

      <!-- Badge de Transcrição de Áudio -->
      <div
        v-if="message.prefixType === 'audio_transcript'"
        class="flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-medium border border-blue-500/20 select-none"
      >
        <Mic class="w-3.5 h-3.5 shrink-0" />
        <span>Áudio transcrito</span>
      </div>

      <!-- Badge de Imagem Analisada por Visão Computacional -->
      <div
        v-if="message.prefixType === 'image_description'"
        class="flex items-center gap-1.5 mb-1.5 px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs font-medium border border-purple-500/20 select-none"
      >
        <Camera class="w-3.5 h-3.5 shrink-0" />
        <span>Imagem analisada</span>
      </div>

      <!-- Anexos de Mídia (Imagens via S3) -->
      <div
        v-if="message.attachments && message.attachments.length > 0"
        class="space-y-1.5 mb-1"
      >
        <div
          v-for="att in message.attachments"
          :key="att.id"
          class="rounded-md overflow-hidden border border-border bg-surface-raised cursor-pointer group relative max-w-sm"
          @click="emit('previewImage', att.url, att.fileName)"
        >
          <img
            :src="att.url"
            :alt="att.fileName"
            class="w-full h-auto max-h-64 object-cover group-hover:scale-101 transition-transform duration-200"
            loading="lazy"
          >
          <div class="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span class="opacity-0 group-hover:opacity-100 bg-black/60 text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-xs transition-opacity">
              Ampliar
            </span>
          </div>
        </div>
      </div>

      <!-- Conteúdo do Texto com Timestamp Inline Estilo WhatsApp -->
      <div class="text-[13.5px] leading-relaxed break-words whitespace-pre-wrap">
        <span>{{ message.displayText }}</span>

        <!-- Timestamp + Checkmarks flutuando à direita no padrão WhatsApp -->
        <span class="inline-flex items-center gap-1 float-right ml-2.5 mt-1.5 text-[10.5px] text-text-muted/80 select-none leading-none">
          <span>{{ formattedTime }}</span>

          <!-- Ícones de entrega para mensagens de saída -->
          <template v-if="!isUser">
            <Clock
              v-if="message.status === 'pending'"
              class="w-3 h-3 text-text-muted animate-spin"
              title="Enviando..."
            />
            <AlertTriangle
              v-else-if="message.status === 'failed'"
              class="w-3 h-3 text-red-500"
              title="Falha no envio"
            />
            <CheckCheck
              v-else-if="message.status === 'read'"
              class="w-3.5 h-3.5 text-blue-500"
              title="Lida"
            />
            <CheckCheck
              v-else-if="message.status === 'delivered'"
              class="w-3.5 h-3.5 text-text-muted"
              title="Entregue"
            />
            <Check
              v-else
              class="w-3.5 h-3.5 text-text-muted"
              title="Enviada"
            />
          </template>
        </span>
      </div>
    </div>

    <!-- Rastro de tools chamadas pelo Agente IA -->
    <div
      v-if="message.toolsUsed && message.toolsUsed.length > 0"
      class="flex items-center gap-1 mt-0.5 max-w-[85%] sm:max-w-[70%] md:max-w-[62%] text-[10px] text-text-muted/80 select-none px-1"
      :title="message.toolsUsed.join(', ')"
    >
      <ToolCase class="w-2.5 h-2.5 shrink-0 opacity-70" />
      <span class="truncate">{{ message.toolsUsed.join(' · ') }}</span>
    </div>
  </div>
</template>
