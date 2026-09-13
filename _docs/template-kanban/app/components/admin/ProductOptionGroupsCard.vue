<!--
  @descricao: Card "Opções / Variações" do formulário de produto.
  @objetivo: Container do editor de grupos de opções (tamanhos, sabores,
    adicionais, personalização) — extraído de `[id].vue` (Card 3). Delega
    cada grupo para `AdminProductOptionGroupItem`.
-->

<script setup lang="ts">
import { ChevronDown, ChevronUp, Plus, Sliders } from '@lucide/vue'
import type { useProductOptionGroups } from '~/composables/useProductOptionGroups'

defineProps<{
  groups: ReturnType<typeof useProductOptionGroups>
}>()
</script>

<template>
  <div class="border border-border bg-surface-raised/40 dark:bg-surface-raised/30 p-5 md:p-6 space-y-5 rounded-xl">
    <!-- Header do Card -->
    <div class="flex items-center justify-between border-b border-border/80 pb-4 flex-wrap gap-3">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-950/50 text-primary-600 border border-primary-200 dark:border-primary-800/40 flex items-center justify-center shrink-0">
          <Sliders class="w-5 h-5" />
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Opções / Variações</h3>
            <span v-if="groups.grupos.value.length > 0" class="text-xs font-semibold text-text-muted bg-surface px-2.5 py-0.5 rounded-full border border-border">
              {{ groups.grupos.value.length }} {{ groups.grupos.value.length === 1 ? 'grupo' : 'grupos' }}
            </span>
          </div>
          <p class="text-xs text-text-muted mt-0.5">Defina tamanhos, cores, sabores, adicionais e personalizações deste produto.</p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="groups.grupos.value.length > 1"
          type="button"
          class="h-9 px-3 text-xs font-medium text-text-secondary hover:text-text-primary rounded-lg border border-border bg-surface hover:bg-surface-raised transition-colors cursor-pointer select-none flex items-center gap-1.5"
          @click="groups.toggleAllGroupsCollapse"
        >
          <component :is="groups.allGroupsCollapsed.value ? ChevronDown : ChevronUp" class="w-3.5 h-3.5" />
          <span>{{ groups.allGroupsCollapsed.value ? 'Expandir todos' : 'Recolher todos' }}</span>
        </button>
        <button
          type="button"
          class="h-9 px-3.5 text-xs font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/60 dark:hover:bg-primary-900/50 border border-primary-200 dark:border-primary-800/50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
          @click="groups.addGrupo"
        >
          <Plus class="w-4 h-4" />
          <span>Adicionar grupo</span>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="groups.grupos.value.length === 0" class="py-10 text-center border-2 border-dashed border-border dark:border-neutral-700 rounded-xl bg-surface/50 text-text-muted space-y-2">
      <Sliders class="w-8 h-8 mx-auto text-text-muted/40" />
      <p class="text-sm font-medium">Nenhum grupo de opções configurado.</p>
      <p class="text-xs text-text-muted">Clique no botão abaixo para adicionar o primeiro grupo (ex: Tamanho, Sabor, Acompanhamentos).</p>
    </div>

    <!-- Lista de Grupos -->
    <div v-if="groups.grupos.value.length > 0" class="space-y-4">
      <AdminProductOptionGroupItem
        v-for="(grupo, gi) in groups.grupos.value"
        :key="gi"
        :groups="groups"
        :grupo="grupo"
        :gi="gi"
      />
    </div>

    <!-- Botão Footer: Adicionar Novo Grupo de Opções (H-11) -->
    <button
      type="button"
      class="w-full h-11 border-2 border-dashed border-border dark:border-neutral-600 hover:border-primary-500/70 bg-surface hover:bg-primary-50/20 dark:hover:bg-primary-950/20 rounded-xl text-xs font-bold uppercase tracking-wider text-text-secondary hover:text-primary-600 transition-all flex items-center justify-center gap-2.5 cursor-pointer group active:scale-[0.99]"
      @click="groups.addGrupo"
    >
      <div class="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-600 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Plus class="w-4 h-4" />
      </div>
      <span>Adicionar novo grupo de opções</span>
    </button>
  </div>
</template>
