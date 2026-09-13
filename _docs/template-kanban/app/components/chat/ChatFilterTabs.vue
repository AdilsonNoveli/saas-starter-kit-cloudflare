<!--
  @descricao: Abas de filtro para a lista de conversas (Estilo Submenu Clear).
  @responsabilidade: Alternar entre Todas, Atenção/Transbordo, Humano e Agente com visual clean e minimalista de submenus.
-->

<script setup lang="ts">
import type { ChatFilterTab } from '#shared/types/chat'
import { AlertCircle, User, Bot, Inbox } from '@lucide/vue'

defineProps<{
  readonly activeTab: ChatFilterTab
  readonly counts: {
    readonly all: number
    readonly attention: number
    readonly human: number
    readonly agent: number
  }
}>()

const emit = defineEmits<{
  select: [tab: ChatFilterTab]
}>()

interface TabItem {
  readonly key: ChatFilterTab
  readonly label: string
  readonly icon: typeof Inbox
  readonly countKey: 'all' | 'attention' | 'human' | 'agent'
  readonly alertBadge?: boolean
}

const tabs: readonly TabItem[] = [
  { key: 'all', label: 'Todas', icon: Inbox, countKey: 'all' },
  { key: 'attention', label: 'Atenção', icon: AlertCircle, countKey: 'attention', alertBadge: true },
  { key: 'human', label: 'Humano', icon: User, countKey: 'human' },
  { key: 'agent', label: 'Agente IA', icon: Bot, countKey: 'agent' },
]
</script>

<template>
  <nav
    class="flex items-center justify-between border-b border-border/80 select-none overflow-hidden"
    aria-label="Filtros de conversas"
  >
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="flex-1 flex items-center justify-center gap-1.5 py-2 px-1 text-xs font-semibold tracking-wide transition-all cursor-pointer relative"
      :class="[
        activeTab === tab.key
          ? 'text-brand font-bold'
          : 'text-text-muted hover:text-text-primary hover:bg-surface-raised/50',
      ]"
      @click="emit('select', tab.key)"
    >
      <component
        :is="tab.icon"
        class="w-3.5 h-3.5 shrink-0"
        :class="[
          tab.alertBadge && counts[tab.countKey] > 0
            ? 'text-red-500'
            : activeTab === tab.key
              ? 'text-brand'
              : 'text-text-muted',
        ]"
      />
      <span class="truncate">{{ tab.label }}</span>
      <span
        v-if="counts[tab.countKey] > 0"
        class="text-[10px] font-bold px-1 rounded-full shrink-0 leading-tight"
        :class="[
          tab.alertBadge
            ? 'bg-red-500/15 text-red-600 dark:text-red-400'
            : activeTab === tab.key
              ? 'bg-brand/15 text-brand'
              : 'bg-surface-raised text-text-muted',
        ]"
      >
        {{ counts[tab.countKey] }}
      </span>

      <!-- Linha indicadora inferior da aba ativa -->
      <span
        v-if="activeTab === tab.key"
        class="absolute bottom-0 inset-x-2 h-0.5 bg-brand rounded-full transition-all"
      />
    </button>
  </nav>
</template>
