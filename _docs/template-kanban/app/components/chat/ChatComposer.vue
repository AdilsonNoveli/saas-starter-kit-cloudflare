<!--
  @descricao: Caixa de composição de mensagens moderna estilo Enterprise Chat.
  @responsabilidade: Orquestrar cabeçalho de contexto, textarea expansível, respostas rápidas, anexos S3 e barra de ações.
-->

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { ChatConversation, SendChatMessagePayload } from '#shared/types/chat'
import { AlertCircle } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'
import ChatComposerHeader from './ChatComposerHeader.vue'
import ChatComposerQuickReplies from './ChatComposerQuickReplies.vue'
import ChatComposerAttachmentList, { type PendingAttachment } from './ChatComposerAttachmentList.vue'
import ChatComposerActions from './ChatComposerActions.vue'

const props = defineProps<{
  readonly conversation?: ChatConversation | null
  readonly disabled?: boolean
  readonly sending?: boolean
  readonly hasValidRecipient?: boolean
}>()

const emit = defineEmits<{
  send: [payload: SendChatMessagePayload]
}>()

const { notify } = useNotification()

const messageText = ref<string>('')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const uploadingImage = ref<boolean>(false)
const isQuickRepliesOpen = ref<boolean>(false)
const isCollapsed = ref<boolean>(false)

const pendingAttachments = ref<PendingAttachment[]>([])

const canSend = computed<boolean>(() => {
  return (
    (messageText.value.trim().length > 0 || pendingAttachments.value.length > 0) &&
    props.hasValidRecipient !== false &&
    !props.disabled &&
    !props.sending
  )
})

// Ajuste dinâmico de altura do textarea
const autoResize = () => {
  void nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.style.height = 'auto'
      const newHeight = Math.min(textareaRef.value.scrollHeight, 160)
      textareaRef.value.style.height = `${Math.max(newHeight, 48)}px`
    }
  })
}

// Disparo de seleção de arquivo para S3
const triggerFileInput = () => {
  if (props.disabled || uploadingImage.value) return
  fileInputRef.value?.click()
}

// Upload de imagem via S3 endpoint (/api/admin/upload)
const onFileSelected = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Limite 10MB
  if (file.size > 10 * 1024 * 1024) {
    notify.error('Arquivo muito grande', 'O tamanho máximo para envio de imagens é 10MB.')
    target.value = ''
    return
  }

  uploadingImage.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucketTarget', 'attachments')

    const res = await $fetch<{
      success: boolean
      data: { url: string; key: string }
    }>('/api/admin/upload', {
      method: 'POST',
      body: formData,
    })

    if (res?.data?.url) {
      pendingAttachments.value.push({
        url: res.data.url,
        key: res.data.key,
        fileName: file.name,
        mimeType: file.type || 'image/jpeg',
        fileSize: file.size,
      })
    }
  } catch {
    notify.error('Erro no upload', 'Não foi possível enviar o anexo. Tente novamente.')
  } finally {
    uploadingImage.value = false
    target.value = ''
  }
}

const removeAttachment = (index: number) => {
  pendingAttachments.value.splice(index, 1)
}

// Inserção de template a partir das respostas rápidas
const onSelectTemplate = (templateText: string) => {
  if (messageText.value) {
    messageText.value += `\n${templateText}`
  } else {
    messageText.value = templateText
  }
  isQuickRepliesOpen.value = false
  autoResize()
  textareaRef.value?.focus()
}

// Envio da mensagem
const handleSend = () => {
  const text = messageText.value.trim()
  if (!canSend.value) return

  emit('send', {
    text,
    attachments: pendingAttachments.value.length > 0 ? [...pendingAttachments.value] : undefined,
  })

  messageText.value = ''
  pendingAttachments.value = []
  if (textareaRef.value) {
    textareaRef.value.style.height = '48px'
  }
}

// Atalho de Teclado: Enter envia, Shift+Enter pula linha
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}
</script>

<template>
  <div class="border-t border-border bg-surface p-3 sm:p-4 shrink-0 select-none">
    <!-- Aviso se o cliente não tem número de WhatsApp cadastrado -->
    <div
      v-if="hasValidRecipient === false"
      class="mb-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs flex items-center gap-2"
    >
      <AlertCircle class="w-4 h-4 text-amber-500 shrink-0" />
      <span>Este cliente ainda não possui um número de WhatsApp cadastrado. O envio está bloqueado.</span>
    </div>

    <!-- Input oculto para anexo de arquivos (S3) -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      class="hidden"
      @change="onFileSelected"
    >

    <!-- Barra de Contexto Superior (Canal, Cliente, Sparkles, Rows4) -->
    <ChatComposerHeader
      :conversation="conversation"
      :is-quick-replies-open="isQuickRepliesOpen"
      :is-collapsed="isCollapsed"
      @toggle-quick-replies="isQuickRepliesOpen = !isQuickRepliesOpen"
      @toggle-collapse="isCollapsed = !isCollapsed"
    />

    <!-- Popover de Respostas Rápidas (Rows4) -->
    <ChatComposerQuickReplies
      :is-open="isQuickRepliesOpen"
      @select-template="onSelectTemplate"
      @close="isQuickRepliesOpen = false"
    />

    <!-- Preview de Anexos Pendentes -->
    <ChatComposerAttachmentList
      :attachments="pendingAttachments"
      @remove="removeAttachment"
    />

    <!-- Caixa Principal do Composer -->
    <div
      v-show="!isCollapsed"
      class="p-2.5 bg-surface-raised/60 focus-within:bg-surface border border-border focus-within:border-brand rounded-2xl transition-all shadow-xs"
    >
      <!-- Textarea sem borda interna -->
      <textarea
        ref="textareaRef"
        v-model="messageText"
        rows="1"
        placeholder="Digite uma mensagem..."
        class="w-full min-h-[48px] max-h-[160px] py-1.5 px-2 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none transition-all resize-none leading-relaxed font-sans"
        :disabled="disabled || sending || hasValidRecipient === false"
        @input="autoResize"
        @keydown="onKeydown"
      />

      <!-- Barra de Ações Inferior (Raio, Emoji, Mic, Clipe e Botão Enviar) -->
      <ChatComposerActions
        :can-send="canSend"
        :sending="sending || false"
        :uploading="uploadingImage"
        :disabled="disabled || hasValidRecipient === false"
        @send="handleSend"
        @trigger-upload="triggerFileInput"
      />
    </div>
  </div>
</template>
