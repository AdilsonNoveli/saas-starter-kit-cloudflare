<!--
  @descricao: Área com histórico cronológico de mensagens e agrupamento por datas.
  @responsabilidade: Scroll automático, separadores de data e lightbox de imagens.
-->

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import type { ChatMessage } from '#shared/types/chat'
import ChatMessageBubble from './ChatMessageBubble.vue'
import ChatMessageImageLightbox from './ChatMessageImageLightbox.vue'
import { ChevronDown, MessageSquare } from '@lucide/vue'

const props = defineProps<{
  readonly messages: readonly ChatMessage[]
  readonly loading: boolean
  /** Existe histórico mais antigo para carregar (G2/§6.4 de `_docs/CHAT/PRD.md`). */
  readonly hasMore?: boolean
  readonly loadingOlder?: boolean
}>()

const emit = defineEmits<{
  loadOlder: []
}>()

/** Distância do topo que dispara o carregamento de mensagens mais antigas. */
const LOAD_OLDER_THRESHOLD_PX = 80

const scrollContainer = ref<HTMLElement | null>(null)
const showScrollBottomButton = ref<boolean>(false)

// Estado do Lightbox de imagem
const lightboxOpen = ref<boolean>(false)
const lightboxImageUrl = ref<string | null>(null)
const lightboxImageName = ref<string | undefined>(undefined)

const openLightbox = (url: string, name?: string) => {
  lightboxImageUrl.value = url
  lightboxImageName.value = name
  lightboxOpen.value = true
}

const closeLightbox = () => {
  lightboxOpen.value = false
  lightboxImageUrl.value = null
  lightboxImageName.value = undefined
}

// Agrupamento de mensagens por data
interface DateGroup {
  readonly dateLabel: string
  readonly messages: readonly ChatMessage[]
}

const groupedMessages = computed<DateGroup[]>(() => {
  const groups: Record<string, ChatMessage[]> = {}

  for (const msg of props.messages) {
    if (!msg.criadoEm) continue
    const date = new Date(msg.criadoEm)
    if (isNaN(date.getTime())) continue

    const now = new Date()
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear()

    let label = ''
    if (isToday) {
      label = 'Hoje'
    } else {
      const yesterday = new Date(now)
      yesterday.setDate(now.getDate() - 1)
      const isYesterday =
        date.getDate() === yesterday.getDate() &&
        date.getMonth() === yesterday.getMonth() &&
        date.getFullYear() === yesterday.getFullYear()

      if (isYesterday) {
        label = 'Ontem'
      } else {
        label = new Intl.DateTimeFormat('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        }).format(date)
      }
    }

    if (!groups[label]) {
      groups[label] = []
    }
    groups[label]!.push(msg)
  }

  return Object.keys(groups).map((label) => ({
    dateLabel: label,
    messages: groups[label] ?? [],
  }))
})

// Rola até o final
const scrollToBottom = (smooth = true) => {
  void nextTick(() => {
    if (scrollContainer.value) {
      scrollContainer.value.scrollTo({
        top: scrollContainer.value.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto',
      })
    }
  })
}

// Detecta posição do scroll para exibir o botão de ir para o fim e para
// disparar o carregamento de histórico mais antigo (scroll para cima).
const onScroll = () => {
  if (!scrollContainer.value) return
  const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
  const distanceToBottom = scrollHeight - scrollTop - clientHeight
  showScrollBottomButton.value = distanceToBottom > 200

  if (scrollTop < LOAD_OLDER_THRESHOLD_PX && props.hasMore && !props.loadingOlder) {
    emit('loadOlder')
  }
}

// Auto-scroll ao carregar ou receber mensagem NOVA (fim da lista). Quando o
// crescimento é por PREPEND de histórico mais antigo (loadOlderMessages,
// `useChat.ts`), a posição visual é preservada em vez de pular para o fim —
// senão o usuário que rolou para cima é arremessado de volta ao carregar mais.
watch(
  () => props.messages,
  (newMessages, oldMessages) => {
    const oldFirstId = oldMessages?.[0]?.id
    const newFirstId = newMessages[0]?.id
    const isPrepend = Boolean(oldMessages?.length) && newMessages.length > (oldMessages?.length ?? 0) && newFirstId !== oldFirstId

    if (isPrepend && scrollContainer.value) {
      const el = scrollContainer.value
      const prevScrollHeight = el.scrollHeight
      void nextTick(() => {
        el.scrollTop += el.scrollHeight - prevScrollHeight
      })
      return
    }

    scrollToBottom(true)
  }
)

onMounted(() => {
  scrollToBottom(false)
})
</script>

<template>
  <div class="relative flex-1 min-h-0 bg-surface-raised/30 flex flex-col">
    <!-- Container de Scroll -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
      @scroll="onScroll"
    >
      <!-- Indicador de carregamento de histórico mais antigo -->
      <div v-if="loadingOlder" class="flex justify-center py-2">
        <div class="w-5 h-5 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <!-- Skeletons de Carregamento -->
      <template v-if="loading && messages.length === 0">
        <div v-for="i in 5" :key="i" class="space-y-2 animate-pulse">
          <div
            class="max-w-xs p-3 rounded-2xl"
            :class="i % 2 === 0 ? 'ml-auto bg-brand/10' : 'bg-surface border border-border'"
          >
            <div class="h-3 bg-border/40 rounded w-36 mb-2" />
            <div class="h-3 bg-border/20 rounded w-48" />
          </div>
        </div>
      </template>

      <!-- Mensagens Agrupadas por Data -->
      <template v-else-if="groupedMessages.length > 0">
        <div
          v-for="group in groupedMessages"
          :key="group.dateLabel"
          class="space-y-3"
        >
          <!-- Separador de Data -->
          <div class="flex items-center justify-center my-4 select-none">
            <span class="px-3 py-1 rounded-full text-[11px] font-medium bg-surface border border-border text-text-muted shadow-2xs">
              {{ group.dateLabel }}
            </span>
          </div>

          <!-- Bolhas do Grupo -->
          <ChatMessageBubble
            v-for="msg in group.messages"
            :key="msg.id"
            :message="msg"
            @preview-image="openLightbox"
          />
        </div>
      </template>

      <!-- Sem Mensagens -->
      <div
        v-else
        class="h-full min-h-[200px] flex flex-col items-center justify-center text-center p-6 text-text-muted"
      >
        <div class="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center mb-2">
          <MessageSquare class="w-5 h-5 text-text-muted" />
        </div>
        <p class="text-sm font-medium text-text-primary">
          Nenhuma mensagem nesta conversa
        </p>
        <p class="text-xs text-text-muted mt-0.5">
          Envie uma mensagem abaixo para iniciar o atendimento.
        </p>
      </div>
    </div>

    <!-- Botão Flutuante de Rolar para o Fim -->
    <button
      v-if="showScrollBottomButton"
      type="button"
      class="absolute bottom-4 right-6 w-9 h-9 rounded-full bg-surface border border-border shadow-lg flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95 cursor-pointer z-10"
      title="Rolar para as mensagens mais recentes"
      @click="scrollToBottom(true)"
    >
      <ChevronDown class="w-5 h-5" />
    </button>

    <!-- Modal de Visualização de Imagem S3 (Lightbox) -->
    <ChatMessageImageLightbox
      :is-open="lightboxOpen"
      :image-url="lightboxImageUrl"
      :image-name="lightboxImageName"
      @close="closeLightbox"
    />
  </div>
</template>
