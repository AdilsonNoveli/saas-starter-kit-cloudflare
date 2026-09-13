<!--
  @descricao: Card de conversa individual na Inbox do Chat.
  @responsabilidade: Exibir avatar, nome, canal, última mensagem, timestamp e status de atendimento clear e objetivo.
-->

<script setup lang="ts">
import { computed } from 'vue'
import type { ChatConversation } from '#shared/types/chat'
import {
  Mic,
  Camera,
  User,
  Bot,
  AlertCircle,
  Phone,
  Globe,
  Share2,
  Send,
} from '@lucide/vue'

const props = defineProps<{
  readonly conversation: ChatConversation
  readonly isActive: boolean
}>()

const emit = defineEmits<{
  select: [clienteId: string]
}>()

// Iniciais do nome para fallback do avatar
const initials = computed<string>(() => {
  const parts = (props.conversation.clienteNome || 'Cliente').trim().split(' ').filter(Boolean)
  if (parts.length === 0) return 'CL'
  if (parts.length === 1) return (parts[0]?.substring(0, 2) ?? 'CL').toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
})

// Formatação inteligente da data/hora (estilo WhatsApp)
const formattedTime = computed<string>(() => {
  if (!props.conversation.lastMessageAt) return ''
  const date = new Date(props.conversation.lastMessageAt)
  if (isNaN(date.getTime())) return ''

  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  if (isToday) {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()

  if (isYesterday) {
    return 'Ontem'
  }

  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date)
})

// Ícone do canal de comunicação
const channelIcon = computed(() => {
  switch (props.conversation.channel) {
    case 'whatsapp':
      return Phone
    case 'instagram':
      return Share2
    case 'telegram':
      return Send
    default:
      return Globe
  }
})
</script>

<template>
  <button
    type="button"
    class="w-full p-3 flex items-start gap-3 rounded-xl text-left transition-all border cursor-pointer select-none relative group"
    :class="[
      isActive
        ? 'bg-surface-raised border-brand/40 shadow-xs'
        : 'bg-surface border-transparent hover:bg-surface-raised/70 hover:border-border/60',
    ]"
    @click="emit('select', conversation.clienteId)"
  >
    <!-- Avatar com indicador de canal -->
    <div class="relative shrink-0">
      <div
        class="w-11 h-11 rounded-full flex items-center justify-center font-medium text-sm border border-border overflow-hidden"
        :class="[
          isActive
            ? 'bg-brand/10 text-brand font-semibold'
            : 'bg-surface-raised text-text-secondary',
        ]"
      >
        <img
          v-if="conversation.clienteAvatar"
          :src="conversation.clienteAvatar"
          :alt="conversation.clienteNome"
          class="w-full h-full object-cover"
        >
        <span v-else>{{ initials }}</span>
      </div>

      <!-- Ícone do canal pequeno no canto inferior do avatar -->
      <span
        class="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-surface border border-border flex items-center justify-center text-[9px] text-text-muted shadow-xs"
        :title="`Canal: ${conversation.channel}`"
      >
        <component :is="channelIcon" class="w-2.5 h-2.5" />
      </span>

      <!-- Bolinha pulsante de transbordo (G13 §5, Camada 1) -->
      <span
        v-if="conversation.pauseStatus === 'transbordo'"
        class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-surface animate-pulse"
        title="Aguardando atendimento humano"
        aria-hidden="true"
      />
    </div>

    <!-- Conteúdo principal -->
    <div class="flex-1 min-w-0">
      <!-- Linha superior: Nome + Hora -->
      <div class="flex items-center justify-between gap-1.5 mb-1">
        <h3 class="text-sm font-semibold text-text-primary truncate">
          {{ conversation.clienteNome || 'Cliente sem nome' }}
        </h3>
        <span class="text-[11px] text-text-muted shrink-0">
          {{ formattedTime }}
        </span>
      </div>

      <!-- Linha intermediária: Preview da última mensagem -->
      <div class="flex items-center gap-1 text-xs text-text-muted mb-1 min-h-[18px]">
        <Mic
          v-if="conversation.lastMessagePrefixType === 'audio_transcript'"
          class="w-3.5 h-3.5 text-blue-500 shrink-0"
        />
        <Camera
          v-else-if="conversation.lastMessagePrefixType === 'image_description'"
          class="w-3.5 h-3.5 text-purple-500 shrink-0"
        />
        <User
          v-else-if="conversation.lastMessagePrefixType === 'human_reply'"
          class="w-3.5 h-3.5 text-brand shrink-0"
        />

        <p class="truncate flex-1">
          {{ conversation.lastMessage || 'Nenhuma mensagem recente' }}
        </p>

        <!-- Contador de mensagens não lidas -->
        <span
          v-if="conversation.unreadCount > 0"
          class="w-4.5 h-4.5 rounded-full bg-brand text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs"
        >
          {{ conversation.unreadCount > 9 ? '9+' : conversation.unreadCount }}
        </span>
      </div>

      <!-- Linha inferior: Status Clear e Objetivo (apenas ícone e nome pequeno) -->
      <div class="flex items-center gap-2 text-xs">
        <!-- Transbordo -->
        <span
          v-if="conversation.pauseStatus === 'transbordo'"
          class="inline-flex items-center gap-1 text-[11px] font-semibold text-red-500"
        >
          <AlertCircle class="w-3 h-3 shrink-0" />
          <span>Atenção</span>
        </span>

        <!-- Humano (Painel) -->
        <span
          v-else-if="conversation.pauseStatus === 'human_manual'"
          class="inline-flex items-center gap-1 text-[11px] font-medium text-blue-500"
        >
          <User class="w-3 h-3 shrink-0" />
          <span>Humano</span>
        </span>

        <!-- Humano (Celular) -->
        <span
          v-else-if="conversation.pauseStatus === 'human_echo'"
          class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500"
        >
          <User class="w-3 h-3 shrink-0" />
          <span>Humano</span>
        </span>

        <!-- Agente IA Clear & Objetivo -->
        <span
          v-else
          class="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted"
        >
          <Bot class="w-3 h-3 text-brand shrink-0" />
          <span>Agente IA</span>
        </span>

        <span
          v-if="conversation.possuiPendencias"
          class="inline-flex items-center text-[10px] font-semibold text-amber-600 dark:text-amber-400"
        >
          • Pendência
        </span>
      </div>
    </div>
  </button>
</template>
