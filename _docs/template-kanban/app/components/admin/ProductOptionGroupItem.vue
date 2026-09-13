<!--
  @descricao: Um grupo de opções (ex: Tamanho, Sabor, Acompanhamentos).
  @objetivo: Cabeçalho (drag handle, nome, tipo, colapsar/remover),
    configuração condicional por tipo e lista de itens — extraído de
    `[id].vue`. Delega cada item para `AdminProductOptionItemRow`.
-->

<script setup lang="ts">
import { Check, ChevronDown, ChevronUp, GripVertical, Plus, Trash2 } from '@lucide/vue'
import {
  ARQUIVO_TIPO_CHIPS,
  TIPO_OPCAO_OPTIONS,
  TIPOS_VALOR_LIVRE,
  type GrupoForm,
  type useProductOptionGroups,
} from '~/composables/useProductOptionGroups'
import type { TipoOpcaoGrupo } from '~~/shared/types/product'

const props = defineProps<{
  groups: ReturnType<typeof useProductOptionGroups>
  gi: number
}>()

const grupo = defineModel<GrupoForm>('grupo', { required: true })

const idPrefix = `${props.gi}`
</script>

<template>
  <div
    class="rounded-xl border transition-all duration-200 overflow-hidden"
    :class="[
      groups.dragOverGrupoIndex.value === gi && groups.draggedGrupoIndex.value !== gi
        ? 'border-primary-500 ring-2 ring-primary-500/30'
        : groups.newlyAddedGrupoIndex.value === gi
          ? 'border-primary-500 ring-2 ring-primary-500/30 bg-surface'
          : 'border-border bg-surface/90 hover:border-border-strong',
      groups.draggedGrupoIndex.value === gi ? 'opacity-40' : ''
    ]"
    @dragover.prevent="groups.onGrupoDragOver($event, gi)"
    @dragleave="groups.onGrupoDragLeave($event, gi)"
    @drop.prevent="groups.onGrupoDrop($event, gi)"
  >
    <!-- Cabeçalho do Grupo (Top Bar) -->
    <div
      class="px-4 py-3 bg-surface-raised/80 flex items-center justify-between gap-3 transition-colors"
      :class="groups.isGrupoCollapsed(gi) ? '' : 'border-b border-border/80'"
    >
      <!-- Lado Esquerdo: Move Handle (Arrasta e Solta) + Nome + Badges -->
      <div class="flex items-center gap-2.5 flex-1 min-w-0">
        <!-- Ícone Move para Arrastar e Soltar -->
        <div
          class="h-9 w-9 bg-surface hover:bg-surface-raised border border-border text-text-muted hover:text-text-primary rounded-lg flex items-center justify-center cursor-grab active:cursor-grabbing shrink-0 transition-colors select-none"
          title="Arrastar e soltar para mover grupo"
          draggable="true"
          @dragstart="groups.onGrupoDragStart($event, gi)"
          @dragend="groups.onGrupoDragEnd"
        >
          <GripVertical class="w-4 h-4" />
        </div>

        <!-- Input Nome do Grupo (Altura H-9 uniforme) -->
        <div class="relative flex-1 min-w-[140px] max-w-sm">
          <label :for="`grupo-nome-${gi}`" class="sr-only">Nome do grupo</label>
          <input
            :id="`grupo-nome-${gi}`"
            v-model="grupo.nome"
            type="text"
            class="w-full h-9 px-3 bg-surface border border-border focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 rounded-lg text-sm font-bold text-text-primary placeholder:text-text-muted transition-all"
            placeholder="Nome do grupo (ex: Tamanho, Modelo, Molho)"
          >
        </div>

        <!-- Badge Novo -->
        <span
          v-if="groups.newlyAddedGrupoIndex.value === gi"
          class="h-7 px-2.5 rounded-full bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-300 dark:border-primary-800 text-[10px] font-bold uppercase tracking-wider flex items-center shrink-0 animate-pulse"
        >
          Novo
        </span>
      </div>

      <!-- Lado Direito: Ações (Chevron + Lixeira) -->
      <div class="flex items-center gap-2 shrink-0">
        <button
          type="button"
          class="h-9 w-9 bg-surface hover:bg-surface-raised border border-border text-text-muted hover:text-text-primary rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          :title="groups.isGrupoCollapsed(gi) ? 'Expandir grupo' : 'Recolher grupo'"
          @click="groups.toggleGrupoCollapse(gi)"
        >
          <component :is="groups.isGrupoCollapsed(gi) ? ChevronDown : ChevronUp" class="w-4 h-4" />
        </button>

        <button
          type="button"
          class="h-9 w-9 bg-surface hover:bg-danger-50 dark:hover:bg-danger-950/40 border border-border hover:border-danger-400 text-text-muted hover:text-danger-600 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
          title="Remover grupo"
          @click="groups.removeGrupo(gi)"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Configurações do Tipo do Grupo (Visível quando aberto) -->
    <div v-show="!groups.isGrupoCollapsed(gi)" class="px-4 py-3 bg-surface/60 border-b border-border/70 flex flex-wrap items-center justify-between gap-3">
      <div class="flex flex-wrap items-center gap-3">
        <!-- Seletor do Tipo (UiSelect com size="md" -> H-9) -->
        <div class="w-full sm:w-64 md:w-72 shrink-0">
          <UiSelect
            :model-value="grupo.tipo"
            :options="TIPO_OPCAO_OPTIONS"
            size="md"
            @update:model-value="(v) => (grupo.tipo = v as TipoOpcaoGrupo)"
          />
        </div>

        <!-- Toggle Obrigatório sem bordas quadradas — texto_livre/upload_arquivo
             sempre perguntam ao cliente (com recusa fácil: "Sem nome"/"Enviar
             depois"), independente deste campo, então o toggle não se aplica
             a esses dois tipos (evita o lojista pensar que desligou algo). -->
        <label
          v-if="!TIPOS_VALOR_LIVRE.has(grupo.tipo)"
          class="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors px-1"
          aria-label="Obrigatório"
        >
          <UiToggle v-model="grupo.obrigatorio" size="sm" />
          <span>Obrigatório</span>
        </label>
        <span
          v-else
          class="h-9 px-3 rounded-lg border border-border bg-surface flex items-center text-xs text-text-muted"
          title="Personalização e arte são sempre perguntadas ao cliente, com opção de recusar (Sem nome / Enviar depois)"
        >
          Sempre perguntado ao cliente
        </span>

        <!-- Limites Min/Max para Multiple em Micro-Card -->
        <div v-if="grupo.tipo === 'multiple'" class="h-9 px-3 bg-surface border border-border rounded-lg flex items-center gap-2 text-xs text-text-muted" title="Limites de seleção mínima e máxima">
          <span class="font-semibold text-text-secondary">Qtd:</span>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-text-muted uppercase">Min</span>
            <input
              :id="`grupo-min-${gi}`"
              v-model.number="grupo.min_selecoes"
              type="number"
              min="0"
              :max="grupo.max_selecoes"
              class="w-10 h-6 px-1 rounded border border-border bg-surface-raised text-center text-xs font-bold text-text-primary focus:outline-none focus:border-primary-500"
              :aria-label="`Mínimo de seleções do grupo ${gi + 1}`"
            >
          </div>
          <span class="text-text-muted">–</span>
          <div class="flex items-center gap-1">
            <span class="text-[10px] text-text-muted uppercase">Max</span>
            <input
              :id="`grupo-max-${gi}`"
              v-model.number="grupo.max_selecoes"
              type="number"
              min="1"
              class="w-10 h-6 px-1 rounded border border-border bg-surface-raised text-center text-xs font-bold text-text-primary focus:outline-none focus:border-primary-500"
              :aria-label="`Máximo de seleções do grupo ${gi + 1}`"
            >
          </div>
        </div>
      </div>
    </div>

    <!-- Corpo do Grupo: Personalização ou Lista de Itens -->
    <div v-show="!groups.isGrupoCollapsed(gi)" class="p-4 bg-surface-raised/20">
      <!-- Config de Personalização (texto_livre / upload_arquivo) -->
      <div v-if="TIPOS_VALOR_LIVRE.has(grupo.tipo)" class="p-4 rounded-xl border border-border bg-surface space-y-4">
        <!-- Nome do item (título mostrado ao staff no pedido/recibo) — mesmo campo que os demais tipos já têm por item, só que aqui há sempre 1 único item-âncora. -->
        <div v-if="grupo.itens[0]">
          <label :for="`grupo-item-nome-${gi}`" class="block text-xs font-semibold text-text-secondary mb-1.5">Nome do item</label>
          <input
            :id="`grupo-item-nome-${gi}`"
            v-model="grupo.itens[0].nome"
            type="text"
            class="w-full h-9 px-3.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
            placeholder="Ex: Nome do noivo, Arte da estampa..."
            :aria-label="`Nome do item do grupo ${gi + 1}`"
          >
        </div>

        <template v-if="grupo.tipo === 'texto_livre'">
          <div>
            <label :for="`grupo-placeholder-${gi}`" class="block text-xs font-semibold text-text-secondary mb-1.5">Texto de exemplo (placeholder)</label>
            <input
              :id="`grupo-placeholder-${gi}`"
              v-model="grupo.texto_placeholder"
              type="text"
              class="w-full h-9 px-3.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all"
              placeholder="Ex: Digite o nome para gravar"
            >
          </div>
          <div class="flex items-center gap-3">
            <label :for="`grupo-max-chars-${gi}`" class="text-xs font-semibold text-text-secondary whitespace-nowrap">Limite de caracteres</label>
            <input
              :id="`grupo-max-chars-${gi}`"
              v-model.number="grupo.texto_max_caracteres"
              type="number"
              min="1"
              max="2000"
              class="w-24 h-9 px-2 rounded-lg border border-border bg-surface text-center text-xs font-bold text-text-primary focus:outline-none focus:border-primary-500"
            >
          </div>
        </template>

        <template v-else>
          <div>
            <span class="block text-xs font-semibold text-text-secondary mb-2">Formatos de arquivo aceitos</span>
            <div class="flex flex-wrap gap-2">
              <label
                v-for="chip in ARQUIVO_TIPO_CHIPS"
                :key="chip.value"
                class="h-8 px-3 rounded-lg border cursor-pointer select-none text-xs font-semibold flex items-center gap-1.5 transition-all"
                :class="grupo.arquivo_tipos_aceitos.includes(chip.value)
                  ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 ring-1 ring-primary-500/30'
                  : 'border-border bg-surface text-text-muted hover:border-primary-300'"
              >
                <input
                  type="checkbox"
                  class="sr-only"
                  :checked="grupo.arquivo_tipos_aceitos.includes(chip.value)"
                  @change="grupo.arquivo_tipos_aceitos = grupo.arquivo_tipos_aceitos.includes(chip.value)
                    ? grupo.arquivo_tipos_aceitos.filter((t) => t !== chip.value)
                    : [...grupo.arquivo_tipos_aceitos, chip.value]"
                >
                <Check v-if="grupo.arquivo_tipos_aceitos.includes(chip.value)" class="w-3.5 h-3.5 text-primary-600" />
                <span>{{ chip.label }}</span>
              </label>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <label :for="`grupo-max-mb-${gi}`" class="text-xs font-semibold text-text-secondary whitespace-nowrap">Tamanho máximo (MB)</label>
            <input
              :id="`grupo-max-mb-${gi}`"
              v-model.number="grupo.arquivo_tamanho_maximo_mb"
              type="number"
              min="1"
              max="15"
              class="w-20 h-9 px-2 rounded-lg border border-border bg-surface text-center text-xs font-bold text-text-primary focus:outline-none focus:border-primary-500"
            >
          </div>
        </template>

        <!-- Taxa Opcional de Personalização -->
        <div v-if="grupo.itens[0]" class="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60">
          <span class="text-xs font-semibold text-text-secondary whitespace-nowrap">Taxa de personalização:</span>
          <div class="h-9 rounded-lg border border-border bg-surface-raised flex items-center overflow-hidden shrink-0">
            <span class="h-full px-2.5 bg-surface border-r border-border text-xs text-text-muted font-medium flex items-center select-none">+ R$</span>
            <input
              v-model.number="grupo.itens[0].preco_delta"
              type="number"
              step="0.01"
              min="0"
              class="h-full w-24 px-2 text-xs text-right font-bold text-text-primary bg-transparent focus:outline-none"
              placeholder="0,00"
              :aria-label="`Taxa de personalização do grupo ${gi + 1}`"
            >
          </div>
        </div>
      </div>

      <!-- Lista de Itens do Grupo (Cada item é um Card delimitado) -->
      <div v-else class="space-y-3">
        <div v-if="grupo.itens.length === 0" class="py-6 text-center border border-dashed border-border dark:border-neutral-700 rounded-xl bg-surface/60 text-xs text-text-muted space-y-1">
          <p class="font-medium">Nenhum item adicionado a este grupo.</p>
          <p class="text-[11px]">Clique no botão abaixo para adicionar o primeiro item (ex: P, M, G, Coca-Cola).</p>
        </div>

        <AdminProductOptionItemRow
          v-for="(_item, ii) in grupo.itens"
          :key="ii"
          v-model:item="grupo.itens[ii]!"
          :id-prefix="`${idPrefix}-${ii}`"
          @remove="groups.removeItem(gi, ii)"
        />

        <!-- Botão Adicionar Item no Grupo (H-9) -->
        <button
          type="button"
          class="w-full h-9 border border-dashed border-border dark:border-neutral-700 hover:border-primary-500/60 bg-surface-raised/40 hover:bg-surface-raised rounded-lg text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.99]"
          @click="groups.addItem(gi)"
        >
          <Plus class="w-3.5 h-3.5" />
          <span>Adicionar item neste grupo</span>
        </button>
      </div>
    </div>
  </div>
</template>
