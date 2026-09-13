<!--
  @descricao: Aba de ações e respostas rápidas na 3ª coluna.
  @responsabilidade: Atalhos de mensagens padrão, copiar dados e links diretos.
-->

<script setup lang="ts">
import type { ChatCustomerContext } from '#shared/types/chat'
import {
  MessageSquarePlus,
  ExternalLink,
  Zap,
} from '@lucide/vue'

defineProps<{
  readonly context: ChatCustomerContext
}>()

const emit = defineEmits<{
  (e: 'insertTemplate', text: string): void
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
  <div class="p-4 space-y-4 text-sm select-none">
    <!-- Modelos de Respostas Rápidas -->
    <div class="space-y-2">
      <h4 class="text-xs font-semibold text-text-primary flex items-center gap-1.5">
        <Zap class="w-3.5 h-3.5 text-amber-500" />
        <span>Respostas Rápidas</span>
      </h4>

      <div class="space-y-1.5">
        <button
          v-for="tpl in templates"
          :key="tpl.title"
          type="button"
          class="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface border border-border text-left transition-all cursor-pointer group shadow-2xs"
          @click="emit('insertTemplate', tpl.text)"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-text-primary group-hover:text-brand transition-colors">
              {{ tpl.title }}
            </span>
            <MessageSquarePlus class="w-3.5 h-3.5 text-text-muted group-hover:text-brand transition-colors" />
          </div>
          <p class="text-[11px] text-text-muted truncate mt-0.5">
            {{ tpl.text }}
          </p>
        </button>
      </div>
    </div>

    <!-- Atalhos de Ação Rápida -->
    <div class="space-y-2 pt-2 border-t border-border/80">
      <h4 class="text-xs font-semibold text-text-primary">
        Atalhos do Sistema
      </h4>

      <div class="space-y-1.5">
        <NuxtLink
          :to="`/admin/customers/${context.id}`"
          class="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface border border-border flex items-center justify-between text-xs font-medium text-text-primary transition-all shadow-2xs"
        >
          <span>Ver Cadastro Completo do Cliente</span>
          <ExternalLink class="w-3.5 h-3.5 text-text-muted" />
        </NuxtLink>

        <NuxtLink
          to="/admin/orders"
          class="w-full p-2.5 rounded-lg bg-surface-raised hover:bg-surface border border-border flex items-center justify-between text-xs font-medium text-text-primary transition-all shadow-2xs"
        >
          <span>Abrir Kanban de Vendas</span>
          <ExternalLink class="w-3.5 h-3.5 text-text-muted" />
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
