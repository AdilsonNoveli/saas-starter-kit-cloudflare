<!--
  @descricao: Barra superior de contexto do Composer do Chat.
  @responsabilidade: Exibir canal ativo, cliente da conversa atual e atalhos (Sparkles, Respostas Rápidas Rows4).
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatConversation } from '#shared/types/chat'
import {
  Sparkles,
  Rows4,
  ChevronUp,
  ChevronDown,
  Phone,
  Share2,
  Send,
} from '@lucide/vue'

const props = defineProps<{
  readonly conversation?: ChatConversation | null
  readonly isQuickRepliesOpen?: boolean
  readonly isCollapsed?: boolean
}>()

const emit = defineEmits<{
  toggleQuickReplies: []
  toggleCollapse: []
}>()

// Iniciais do cliente para avatar
const initials = computed<string>(() => {
  const parts = (props.conversation?.clienteNome || 'Cliente').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return (parts[0]?.substring(0, 2) ?? 'CL').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
})

// Ícone e nome legível do canal
const channelInfo = computed(() => {
  switch (props.conversation?.channel) {
    case 'whatsapp':
      return { label: 'WhatsApp', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400' }
    case 'instagram':
      return { label: 'Instagram', icon: Share2, color: 'text-pink-600 dark:text-pink-400' }
    case 'telegram':
      return { label: 'Telegram', icon: Send, color: 'text-sky-600 dark:text-sky-400' }
    default:
      return { label: 'WhatsApp', icon: Phone, color: 'text-emerald-600 dark:text-emerald-400' }
  }
})
</script>

<template>
  <div class="flex items-center justify-between px-1 pb-2 text-xs select-none">
    <!-- Lado Esquerdo: Canal + Mini Avatar + Nome do Cliente -->
    <div class="flex items-center gap-2 min-w-0">
      <!-- Badge do Canal -->
      <div class="flex items-center gap-1.5 font-semibold text-text-primary">
        <component
          :is="channelInfo.icon"
          class="w-4 h-4 shrink-0"
          :class="channelInfo.color"
        />
        <span class="font-bold">Chat</span>
        <span class="text-text-muted font-normal">com</span>
      </div>

      <!-- Mini Avatar e Nome do Cliente -->
      <div class="flex items-center gap-1.5 min-w-0">
        <div class="w-5 h-5 rounded-full bg-brand/10 text-brand font-bold text-[10px] flex items-center justify-center overflow-hidden border border-border shrink-0">
          <img
            v-if="conversation?.clienteAvatar"
            :src="conversation.clienteAvatar"
            :alt="conversation.clienteNome"
            class="w-full h-full object-cover"
          >
          <span v-else>{{ initials }}</span>
        </div>
        <span class="font-semibold text-text-primary truncate max-w-[160px] sm:max-w-[240px]">
          {{ conversation?.clienteNome || 'Cliente' }}
        </span>
      </div>
    </div>

    <!-- Lado Direito: Ações Superiores (Sparkles, Rows4 / Respostas Rápidas, Chevron) -->
    <div class="flex items-center gap-1">
      <!-- Botão Sparkles (Sem funcionalidade por enquanto) -->
      <button
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-brand hover:bg-surface-raised transition-colors cursor-pointer"
        title="Assistente IA (em breve)"
        aria-label="Assistente IA"
      >
        <Sparkles class="w-4 h-4" />
      </button>

      <!-- Botão Rows-4 (Respostas Rápidas) -->
      <button
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
        :class="[
          isQuickRepliesOpen
            ? 'bg-brand/15 text-brand font-bold'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-raised',
        ]"
        title="Respostas Rápidas"
        aria-label="Respostas Rápidas"
        @click="emit('toggleQuickReplies')"
      >
        <Rows4 class="w-4 h-4" />
      </button>

      <!-- Botão Chevron para recolher / expandir -->
      <button
        type="button"
        class="w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        :title="isCollapsed ? 'Expandir caixa de mensagem' : 'Recolher caixa de mensagem'"
        aria-label="Alternar expansão"
        @click="emit('toggleCollapse')"
      >
        <ChevronDown v-if="isCollapsed" class="w-4 h-4" />
        <ChevronUp v-else class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>
