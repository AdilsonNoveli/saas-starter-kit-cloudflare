<!--
  @descricao: Coluna 3 do Chat — Barra Lateral Retrátil de Detalhes do Cliente e Pedidos.
  @responsabilidade: Alternar abas entre Perfil do Cliente, Pedidos Recentes e Ações Rápidas.
-->

<script setup lang="ts">
import { ref } from 'vue'
import type { ChatCustomerContext } from '#shared/types/chat'
import ChatCustomerProfileTab from './ChatCustomerProfileTab.vue'
import ChatCustomerOrdersTab from './ChatCustomerOrdersTab.vue'
import ChatQuickActionsTab from './ChatQuickActionsTab.vue'
import {
  ChevronRight,
  User,
  ShoppingBag,
  Zap,
  Loader2,
} from '@lucide/vue'

defineProps<{
  readonly context: ChatCustomerContext | null
  readonly loading: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'insertTemplate', text: string): void
}>()

type DetailsTab = 'profile' | 'orders' | 'actions'
const currentTab = ref<DetailsTab>('profile')
</script>

<template>
  <aside class="w-full md:w-[360px] lg:w-[380px] h-full flex flex-col bg-surface border-l border-border shrink-0 select-none overflow-hidden z-20">
    <!-- Cabeçalho da Barra Lateral -->
    <header class="h-16 px-4 flex items-center justify-between border-b border-border bg-surface shrink-0">
      <h3 class="font-semibold text-sm text-text-primary">
        Dados do Atendimento
      </h3>
      <button
        type="button"
        class="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer"
        title="Ocultar painel (Chevron Right)"
        aria-label="Ocultar painel"
        @click="emit('close')"
      >
        <ChevronRight class="w-4 h-4" />
      </button>
    </header>

    <!-- Navegação por Abas Clear -->
    <nav class="flex items-center justify-between border-b border-border/80 px-2 select-none overflow-hidden" aria-label="Abas do atendimento">
      <button
        type="button"
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 text-xs font-semibold tracking-wide transition-all cursor-pointer relative"
        :class="[
          currentTab === 'profile'
            ? 'text-brand font-bold'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-raised/50',
        ]"
        @click="currentTab = 'profile'"
      >
        <User class="w-3.5 h-3.5 shrink-0" :class="currentTab === 'profile' ? 'text-brand' : 'text-text-muted'" />
        <span>Cliente</span>
        <span
          v-if="currentTab === 'profile'"
          class="absolute bottom-0 inset-x-2 h-0.5 bg-brand rounded-full transition-all"
        />
      </button>

      <button
        type="button"
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 text-xs font-semibold tracking-wide transition-all cursor-pointer relative"
        :class="[
          currentTab === 'orders'
            ? 'text-brand font-bold'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-raised/50',
        ]"
        @click="currentTab = 'orders'"
      >
        <ShoppingBag class="w-3.5 h-3.5 shrink-0" :class="currentTab === 'orders' ? 'text-brand' : 'text-text-muted'" />
        <span>Pedidos</span>
        <span
          v-if="currentTab === 'orders'"
          class="absolute bottom-0 inset-x-2 h-0.5 bg-brand rounded-full transition-all"
        />
      </button>

      <button
        type="button"
        class="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-1 text-xs font-semibold tracking-wide transition-all cursor-pointer relative"
        :class="[
          currentTab === 'actions'
            ? 'text-brand font-bold'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-raised/50',
        ]"
        @click="currentTab = 'actions'"
      >
        <Zap class="w-3.5 h-3.5 shrink-0" :class="currentTab === 'actions' ? 'text-brand' : 'text-text-muted'" />
        <span>Ações</span>
        <span
          v-if="currentTab === 'actions'"
          class="absolute bottom-0 inset-x-2 h-0.5 bg-brand rounded-full transition-all"
        />
      </button>
    </nav>

    <!-- Conteúdo da Aba -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading State -->
      <div
        v-if="loading && !context"
        class="h-64 flex flex-col items-center justify-center text-text-muted gap-2"
      >
        <Loader2 class="w-6 h-6 animate-spin text-brand" />
        <span class="text-xs">Carregando dados...</span>
      </div>

      <!-- Abas Ativas -->
      <template v-else-if="context">
        <ChatCustomerProfileTab
          v-if="currentTab === 'profile'"
          :context="context"
        />

        <ChatCustomerOrdersTab
          v-else-if="currentTab === 'orders'"
          :orders="context.pedidosRecentes"
        />

        <ChatQuickActionsTab
          v-else-if="currentTab === 'actions'"
          :context="context"
          @insert-template="(text) => emit('insertTemplate', text)"
        />
      </template>

      <!-- Erro ao Carregar -->
      <div
        v-else
        class="p-6 text-center text-text-muted text-xs"
      >
        Não foi possível carregar as informações do cliente.
      </div>
    </div>
  </aside>
</template>
