<!--
  @descricao: Card "Estoque" (Gestão de Estoque, migration 111).
  @objetivo: Política de controle de estoque do produto + ajuste inline de
    saldo + receita/BOM de insumos — extraído de `[id].vue` (Card 1c).
    `estoqueForm`/`ajusteDelta` via `defineModel` (dois-vias) — as demais
    partes da composable (`controleEstoqueOptions`, `aplicarAjusteInline`)
    são só leitura/chamada, recebidas via prop `estoque`.
-->

<script setup lang="ts">
import { Check, ShoppingBag } from '@lucide/vue'
import type { EstoqueFormState, useProductEstoque } from '~/composables/useProductEstoque'
import type { useProductReceitaInsumos } from '~/composables/useProductReceitaInsumos'

const props = defineProps<{
  estoque: ReturnType<typeof useProductEstoque>
  receita: ReturnType<typeof useProductReceitaInsumos>
  unidadeMedida: string
  permiteFracionamento: boolean
  isPreorderEnabled: boolean
  isNew: boolean
  produtoId: string | null
}>()

const estoqueForm = defineModel<EstoqueFormState>('estoqueForm', { required: true })
const ajusteDelta = defineModel<number>('ajusteDelta', { required: true })

function onAplicarAjuste(): void {
  if (props.produtoId) void props.estoque.aplicarAjusteInline(props.produtoId)
}
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center gap-2 border-b border-border pb-3">
      <ShoppingBag class="w-4.5 h-4.5 text-brand-green" />
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Estoque</h3>
    </div>

    <div>
      <label class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Controle de estoque</label>
      <UiSelect
        :model-value="estoqueForm.controle_estoque"
        :options="estoque.controleEstoqueOptions.value"
        @update:model-value="(v) => estoqueForm.controle_estoque = (v as EstoqueFormState['controle_estoque'])"
      />
      <p class="text-[10px] text-text-muted mt-1">
        <span class="font-medium">Nenhum:</span> vende sem limites, sem controle de saldo.
        <span class="font-medium">Contagem:</span> desconta do estoque a cada venda — para quando acabar.
        <span class="font-medium">Produção diária:</span> define quantas unidades podem ser vendidas por dia; reseta sozinho à meia-noite.
      </p>
    </div>

    <div v-if="estoqueForm.controle_estoque === 'contagem'">
      <!-- Produto novo: só o valor inicial, sem trilha de ajuste ainda (não existe id). -->
      <div v-if="isNew" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label for="estoque-inicial" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Estoque inicial</label>
          <input
            id="estoque-inicial"
            v-model.number="estoqueForm.estoque_atual"
            type="number"
            min="0"
            step="any"
            class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors"
          >
        </div>
        <div>
          <label for="estoque-minimo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1.5">Estoque mínimo</label>
          <input
            id="estoque-minimo"
            v-model.number="estoqueForm.estoque_minimo"
            type="number"
            min="0"
            step="any"
            placeholder="Sem alerta"
            class="w-full px-3 py-2 border border-border rounded bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors"
          >
        </div>
      </div>

      <!-- Produto existente: grid adaptável.
           Sem preorder: 2 col (Ajuste+btn / Alerta)
           Com preorder + contagem: 3 col (Ajuste+btn / Alerta / Limite) -->
      <div v-else class="space-y-2.5">
        <p class="text-xs text-text-muted">
          Saldo atual: <span class="font-bold text-text-primary tabular-nums">{{ estoqueForm.estoque_atual }} {{ unidadeMedida || 'un' }}</span>
        </p>
        <div
          class="grid grid-cols-1 gap-4 items-end"
          :class="isPreorderEnabled ? 'sm:grid-cols-3' : 'sm:grid-cols-2'"
        >
          <!-- Ajuste + botão CircleCheck grudado à direita -->
          <div>
            <div class="flex items-center gap-1.5 mb-1.5">
              <label for="ajuste-delta" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Ajuste</label>
              <UiInfoTip text="Some ou subtrai do saldo atual. Ex.: +5 adiciona, -3 remove." />
            </div>
            <div class="flex">
              <UiNumberInput
                id="ajuste-delta"
                :model-value="ajusteDelta"
                :attach-right="true"
                placeholder="0"
                class="flex-1 min-w-0"
                @update:model-value="(v) => ajusteDelta = v ?? 0"
                @keyup:enter="onAplicarAjuste"
              />
              <button
                type="button"
                class="shrink-0 flex items-center justify-center px-2.5 border border-l-0 border-border rounded-r bg-brand-green/10 hover:bg-brand-green/20 text-brand-green transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="!ajusteDelta || estoque.aplicandoAjuste.value"
                :aria-label="estoque.aplicandoAjuste.value ? 'Ajustando…' : 'Confirmar ajuste'"
                @click="onAplicarAjuste"
              >
                <Check class="w-4 h-4" />
              </button>
            </div>
          </div>

          <!-- Alerta -->
          <div>
            <div class="flex items-center gap-1.5 mb-1.5">
              <label for="estoque-minimo" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Alerta</label>
              <UiInfoTip text="Avisa quando o saldo cair abaixo deste valor. Deixe vazio para desativar." />
            </div>
            <UiNumberInput
              id="estoque-minimo"
              :model-value="estoqueForm.estoque_minimo"
              :min="0"
              placeholder="Sem alerta"
              @update:model-value="(v) => estoqueForm.estoque_minimo = v"
            />
          </div>

          <!-- Limite: aparece no grid somente quando contagem + preorder -->
          <div v-if="isPreorderEnabled">
            <div class="flex items-center gap-1.5 mb-1.5">
              <label for="producao-diaria-limite" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">Limite</label>
              <UiInfoTip text="Máximo de pedidos aceitos no mesmo dia. Ao atingir, a data bloqueia automaticamente." />
            </div>
            <UiNumberInput
              id="producao-diaria-limite"
              :model-value="estoqueForm.producao_diaria_limite"
              :min="0.001"
              :step="permiteFracionamento ? 0.1 : 1"
              @update:model-value="(v) => estoqueForm.producao_diaria_limite = v"
            />
          </div>
        </div>
      </div>
    </div>

    <!--
      Limite Diário — seção standalone.
      Aparece apenas para controle_estoque='producao_diaria' (pronta entrega).
      Para encomenda com 'contagem', o campo já está no grid acima.
      Para encomenda com 'nenhum', o campo não é exibido (a pergunta do usuário).
    -->
    <div v-if="estoqueForm.controle_estoque === 'producao_diaria' && !isPreorderEnabled">
      <div class="flex items-center gap-1.5 mb-1.5">
        <label for="producao-diaria-limite" class="block text-xs font-semibold text-text-muted uppercase tracking-wider">
          Limite diário ({{ unidadeMedida || 'un' }}/dia)
        </label>
        <UiInfoTip
          text="Quanto pode ser produzido por dia. Quando atingido, para de vender automaticamente até o dia seguinte."
          position="right"
        />
      </div>
      <UiNumberInput
        id="producao-diaria-limite"
        :model-value="estoqueForm.producao_diaria_limite"
        :min="0.001"
        :step="permiteFracionamento ? 0.1 : 1"
        class="w-full sm:w-1/3"
        @update:model-value="(v) => estoqueForm.producao_diaria_limite = v"
      />
    </div>

    <AdminProductReceitaInsumos :receita="receita" />
  </div>
</template>
