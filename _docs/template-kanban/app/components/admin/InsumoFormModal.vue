<!--
  @descricao: Modal de criação/edição de insumo (matéria-prima), Gestão de Estoque (migration 111).
  @objetivo: Nome + unidade + estoque inicial (só na criação) + mínimo. Ajuste
    de estoque de insumo já existente é feito por InventoryAdjustModal, nunca
    por aqui (KISS/SoC — mesma separação de responsabilidade do doc).
-->

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { SelectValue } from '~/components/ui/Select.vue'

interface Insumo {
  id: string
  nome: string
  unidade_medida: string
  estoque_atual: number
  estoque_minimo: number | null
  ativo: boolean
}

const props = defineProps<{
  /** `null` = criar novo insumo. */
  readonly insumo: Insumo | null
  readonly open: boolean
}>()

const emit = defineEmits<{
  (e: 'close' | 'saved'): void
}>()

const UNIDADE_OPTIONS = [
  { value: 'unidade', label: 'Unidade' },
  { value: 'kg', label: 'Quilograma' },
  { value: 'litro', label: 'Litro' },
  { value: 'metro', label: 'Metro' },
  { value: 'caixa', label: 'Caixa' },
]

const nome = ref('')
const unidadeMedida = ref<string>('unidade')
const estoqueInicial = ref<number>(0)
const estoqueMinimo = ref<number | null>(null)
const ativo = ref(true)
const saving = ref(false)
const errorMessage = ref<string | null>(null)

const isEdit = computed(() => props.insumo !== null)

watch(
  () => [props.insumo, props.open] as const,
  ([insumo, isOpen]) => {
    if (!isOpen) return
    errorMessage.value = null
    nome.value = insumo?.nome ?? ''
    unidadeMedida.value = insumo?.unidade_medida ?? 'unidade'
    estoqueInicial.value = insumo?.estoque_atual ?? 0
    estoqueMinimo.value = insumo?.estoque_minimo ?? null
    ativo.value = insumo?.ativo ?? true
  },
  { immediate: true },
)

async function handleSave(): Promise<void> {
  if (!nome.value.trim()) {
    errorMessage.value = 'Informe o nome do insumo.'
    return
  }

  saving.value = true
  errorMessage.value = null
  try {
    if (isEdit.value && props.insumo) {
      await $fetch(`/api/admin/inventory/insumos/${props.insumo.id}`, {
        method: 'PUT',
        body: { nome: nome.value.trim(), unidade_medida: unidadeMedida.value, estoque_minimo: estoqueMinimo.value, ativo: ativo.value },
      })
    } else {
      await $fetch('/api/admin/inventory/insumos', {
        method: 'POST',
        body: { nome: nome.value.trim(), unidade_medida: unidadeMedida.value, estoque_atual: estoqueInicial.value, estoque_minimo: estoqueMinimo.value },
      })
    }
    emit('saved')
    emit('close')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    errorMessage.value = message ?? 'Erro ao salvar o insumo. Tente novamente.'
  } finally {
    saving.value = false
  }
}

const handleClose = (): void => emit('close')
</script>

<template>
  <UiModal
    :open="open"
    :title="isEdit ? 'Editar insumo' : 'Novo insumo'"
    size="md"
    @update:open="(v) => !v && handleClose()"
  >
    <div class="space-y-3 text-sm">
      <div>
        <label for="insumo-nome" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Nome</label>
        <input
          id="insumo-nome"
          v-model="nome"
          type="text"
          maxlength="200"
          placeholder="Ex.: Farinha de trigo"
          class="block w-full h-9 px-3 border border-border rounded-md bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
        >
      </div>

      <div>
        <label class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Unidade de medida</label>
        <UiSelect :model-value="unidadeMedida as SelectValue" :options="UNIDADE_OPTIONS" @update:model-value="(v) => unidadeMedida = String(v)" />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div v-if="!isEdit">
          <label for="insumo-estoque-inicial" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Estoque inicial</label>
          <input
            id="insumo-estoque-inicial"
            v-model.number="estoqueInicial"
            type="number"
            min="0"
            step="any"
            class="block w-full h-9 px-3 border border-border rounded-md bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
          >
        </div>
        <div>
          <label for="insumo-estoque-minimo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Estoque mínimo</label>
          <input
            id="insumo-estoque-minimo"
            v-model.number="estoqueMinimo"
            type="number"
            min="0"
            step="any"
            placeholder="Sem alerta"
            class="block w-full h-9 px-3 border border-border rounded-md bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
          >
        </div>
      </div>

      <label v-if="isEdit" class="flex items-center gap-2 text-xs text-text-secondary">
        <input v-model="ativo" type="checkbox" class="rounded border-border">
        Insumo ativo (disponível para uso em receitas)
      </label>

      <p v-if="errorMessage" class="text-xs text-danger-600 bg-danger-50 dark:bg-danger-950/15 border border-danger-200/50 rounded-lg px-3 py-2">
        {{ errorMessage }}
      </p>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2 w-full">
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-xs font-bold uppercase tracking-wider cursor-pointer bg-surface active:scale-95"
          :disabled="saving"
          @click="handleClose"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors active:scale-95 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          :disabled="saving"
          @click="handleSave"
        >
          {{ saving ? 'Salvando…' : 'Salvar' }}
        </button>
      </div>
    </template>
  </UiModal>
</template>
