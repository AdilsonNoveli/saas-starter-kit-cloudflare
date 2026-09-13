<!--
  @descricao: Popover suspenso de respostas rápidas acionado pelo botão Rows4 no Composer.
  @responsabilidade: Permitir seleção rápida de templates e inserção no campo de texto.
-->

<script setup lang="ts">
import { MessageSquarePlus, Zap, X } from '@lucide/vue'

defineProps<{
  readonly isOpen: boolean
}>()

const emit = defineEmits<{
  selectTemplate: [text: string]
  close: []
}>()

interface QuickTemplate {
  readonly title: string
  readonly text: string
}

const templates: readonly QuickTemplate[] = [
  {
    title: 'Saudação de Atendimento',
    text: 'Olá! Sou o atendente da loja. Como posso ajudar você hoje?',
  },
  {
    title: 'Pedido em Produção',
    text: 'Seu pedido já está sendo preparado pela nossa equipe com muito carinho!',
  },
  {
    title: 'Saiu para Entrega',
    text: 'Ótima notícia! Seu pedido acabou de sair para entrega com nosso entregador.',
  },
  {
    title: 'Chave PIX',
    text: 'Nossa chave PIX oficial é o CNPJ da loja. Assim que efetuar o pagamento, por favor envie o comprovante por aqui!',
  },
  {
    title: 'Agradecimento & Avaliação',
    text: 'Muito obrigado pela preferência! Esperamos que tenha uma excelente experiência.',
  },
]
</script>

<template>
  <Transition
    enter-active-class="transition duration-150 ease-out"
    enter-from-class="opacity-0 translate-y-2 scale-95"
    enter-to-class="opacity-100 translate-y-0 scale-100"
    leave-active-class="transition duration-100 ease-in"
    leave-from-class="opacity-100 translate-y-0 scale-100"
    leave-to-class="opacity-0 translate-y-2 scale-95"
  >
    <div
      v-if="isOpen"
      class="mb-2 p-3 bg-surface border border-border rounded-xl shadow-xl space-y-2 select-none"
    >
      <div class="flex items-center justify-between pb-1.5 border-b border-border/80">
        <div class="flex items-center gap-1.5 text-xs font-bold text-text-primary">
          <Zap class="w-3.5 h-3.5 text-amber-500" />
          <span>Respostas Rápidas</span>
        </div>
        <button
          type="button"
          class="w-5 h-5 rounded flex items-center justify-center text-text-muted hover:text-text-primary transition-colors cursor-pointer"
          title="Fechar"
          @click="emit('close')"
        >
          <X class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="max-h-48 overflow-y-auto space-y-1.5 pr-1">
        <button
          v-for="tpl in templates"
          :key="tpl.title"
          type="button"
          class="w-full p-2 rounded-lg bg-surface-raised hover:bg-surface border border-border text-left transition-all cursor-pointer group shadow-2xs"
          @click="emit('selectTemplate', tpl.text)"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors">
              {{ tpl.title }}
            </span>
            <MessageSquarePlus class="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors shrink-0 ml-1" />
          </div>
          <p class="text-[11px] text-text-muted truncate mt-0.5">
            {{ tpl.text }}
          </p>
        </button>
      </div>
    </div>
  </Transition>
</template>
