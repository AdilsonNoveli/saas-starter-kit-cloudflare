<!--
  @descricao: Barra de ações e botões inferiores dentro da caixa de mensagem (Composer Actions).
  @responsabilidade: Integrar botão de raio (Zap), ferramentas (Type, Smile, Mic, Paperclip) e botão principal 'Enviar'.
-->

<script setup lang="ts">
import {
  Zap,
  Type,
  Smile,
  Mic,
  Paperclip,
  Send,
  Loader2,
  EllipsisVertical,
} from '@lucide/vue'

defineProps<{
  readonly canSend: boolean
  readonly sending: boolean
  readonly uploading: boolean
  readonly disabled?: boolean
}>()

const emit = defineEmits<{
  send: []
  triggerUpload: []
}>()
</script>

<template>
  <div class="flex items-center justify-between pt-2 px-1 select-none">
    <!-- Lado Esquerdo: Ícone de Raio (sem funcionalidade por enquanto) -->
    <div class="flex items-center gap-1">
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-amber-500 hover:bg-surface-raised transition-colors cursor-pointer"
        title="Ações rápidas / Raio (em breve)"
        aria-label="Ações rápidas"
      >
        <Zap class="w-4 h-4" />
      </button>
    </div>

    <!-- Lado Direito: Ferramentas (Type, Smile, Mic, Paperclip) + Botão 'Enviar' -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Ícone T (Formatação de Texto) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer hidden sm:flex"
        title="Formatação de texto"
        aria-label="Formatação de texto"
      >
        <Type class="w-4 h-4" />
      </button>

      <!-- Ícone Emoji (Smile) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        title="Emojis"
        aria-label="Emojis"
      >
        <Smile class="w-4 h-4" />
      </button>

      <!-- Ícone Microfone (Mic) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        title="Mensagem de áudio"
        aria-label="Gravar áudio"
      >
        <Mic class="w-4 h-4" />
      </button>

      <!-- Ícone Clipe / Anexo (Paperclip - Upload S3) -->
      <button
        type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer disabled:opacity-40"
        :disabled="disabled || uploading"
        title="Anexar imagem ou arquivo (S3)"
        aria-label="Anexar arquivo"
        @click="emit('triggerUpload')"
      >
        <Loader2 v-if="uploading" class="w-4 h-4 animate-spin text-brand" />
        <Paperclip v-else class="w-4 h-4" />
      </button>

      <!-- Botão Principal 'Enviar' com estilo Pílula e Menu -->
      <button
        type="button"
        class="h-9 pl-3.5 pr-2 rounded-xl bg-brand hover:bg-brand-hover text-white flex items-center gap-1.5 text-xs font-semibold shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ml-1"
        :disabled="!canSend || sending || disabled"
        title="Enviar mensagem (Enter)"
        @click="emit('send')"
      >
        <Loader2 v-if="sending" class="w-4 h-4 animate-spin" />
        <template v-else>
          <span>Enviar</span>
          <Send class="w-3.5 h-3.5" />
          <span class="w-[1px] h-3.5 bg-white/30 mx-0.5" />
          <EllipsisVertical class="w-3.5 h-3.5 opacity-80" />
        </template>
      </button>
    </div>
  </div>
</template>
