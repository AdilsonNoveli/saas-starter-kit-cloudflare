<script setup lang="ts">
/**
 * @descricao: Shell das configurações da loja.
 * @objetivo: Cabeçalho + menu de abas como rotas de verdade (§8.19 de
 *   `_docs/em-andamento.md`). Antes as seis abas eram um `v-show` sobre um
 *   `activeTab` com `?tab=` reimplementando à mão o que o router já faz; agora
 *   cada aba é uma página filha, com o próprio chunk, o próprio carregamento e
 *   o próprio "Salvar".
 */
import { useState } from 'nuxt/app'
import { useRoute } from 'vue-router'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

const abas: Array<{ to: string, label: string }> = [
  { to: '/admin/settings', label: 'Negócio' },
  { to: '/admin/settings/users', label: 'Usuários' },
  { to: '/admin/settings/customization', label: 'Aparência' },
  { to: '/admin/settings/pages', label: 'Páginas' },
  { to: '/admin/settings/agent', label: 'Agente IA' },
  { to: '/admin/settings/quick-responses', label: 'Respostas Rápidas' },
  { to: '/admin/settings/integrations', label: 'Integração' },
  { to: '/admin/settings/webhooks', label: 'Webhooks' },
  { to: '/admin/settings/advanced', label: 'Avançado' },
]

/**
 * Comparação exata, e não `active-class` do `NuxtLink`: `/admin/settings` é
 * prefixo de todas as outras rotas, então a classe "ativa" por prefixo
 * destacaria "Negócio" em qualquer aba. Barra final é normalizada porque o
 * router aceita as duas formas.
 */
function abaAtiva(to: string): boolean {
  const currentPath = route.path.replace(/\/$/, '')
  if (to === '/admin/settings/integrations') {
    return currentPath === '/admin/settings/integrations' || currentPath.startsWith('/admin/settings/whatsapp')
  }
  // Quick Responses tem sub-rotas (/new, /[id]) — mesmo tratamento de
  // integrations/whatsapp acima, senão a aba apaga ao criar/editar uma regra.
  if (to === '/admin/settings/quick-responses') {
    return currentPath.startsWith('/admin/settings/quick-responses')
  }
  return currentPath === to
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans">

    <!-- Header (Header Padrão Consistente) -->
    <header class="bg-surface sticky top-0 z-20 border-b border-border select-none shrink-0">
      <div class="h-16 flex items-center justify-between px-4 sm:px-6 bg-surface">
        <h1
          class="text-xs font-bold text-text-primary uppercase tracking-wider"
          :class="mobileState === 'hidden' ? 'max-md:ml-12' : ''"
        >
          Configurações
        </h1>
      </div>

      <!-- Tabs (Visual Clear Sem Linha) -->
      <div class="h-10 flex items-center gap-6 px-6 bg-surface border-t border-border/50 overflow-x-auto" style="scrollbar-width:none">
        <NuxtLink
          v-for="aba in abas"
          :key="aba.to"
          :to="aba.to"
          class="text-sm font-medium transition-colors whitespace-nowrap cursor-pointer"
          :class="abaAtiva(aba.to) ? 'text-brand-green' : 'text-text-muted hover:text-text-primary'"
          active-class=""
          exact-active-class=""
        >
          {{ aba.label }}
        </NuxtLink>
      </div>
    </header>

    <NuxtPage />
  </div>
</template>

<style scoped>
/* Esconde scrollbar das tabs */
header div[style] {
  scrollbar-width: none;
}
header div[style]::-webkit-scrollbar {
  display: none;
}
</style>
