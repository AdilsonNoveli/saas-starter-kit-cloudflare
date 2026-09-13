<!--
  @descricao: Campos extras condicionais de uma Resposta Rápida do Agente IA,
    de acordo com o gatilho escolhido.
  @responsabilidade: Isolar o "conhecimento" de cada gatilho (o que ele
    precisa de configuração extra) da página de formulário — que não deveria
    saber nada sobre palavras-chave ou etapas de Kanban, só orquestrar.
-->
<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { QuickResponseTrigger } from '#shared/types/agentQuickResponse'
import type { Option as SelectOption } from '~/components/ui/Select.vue'

const props = defineProps<{
  readonly triggerType: QuickResponseTrigger
  readonly keywordsText: string
  readonly kanbanStageKey: string | null
}>()

const emit = defineEmits<{
  'update:keywordsText': [value: string]
  'update:kanbanStageKey': [value: string | null]
}>()

const supabase = useSupabaseClient()

interface KanbanStage {
  readonly chave: string
  readonly label: string
}

const kanbanStages = ref<KanbanStage[]>([])
const loadingStages = ref(false)
const stagesLoaded = ref(false)

/**
 * Direto pelo client Supabase (RLS `is_staff()` já cobre leitura) — mesmo
 * padrão já usado em `app/pages/admin/orders/index.vue`, sem inventar um
 * endpoint novo pra uma leitura simples já coberta.
 */
async function loadKanbanStages(): Promise<void> {
  if (stagesLoaded.value) return
  loadingStages.value = true
  const { data } = await supabase.from('kanban_column').select('chave:key, label').order('sort_order')
  kanbanStages.value = data ?? []
  loadingStages.value = false
  stagesLoaded.value = true
}

onMounted(() => {
  if (props.triggerType === 'kanban_stage') void loadKanbanStages()
})

watch(() => props.triggerType, (t) => {
  if (t === 'kanban_stage') void loadKanbanStages()
})

const kanbanStageOptions = computed<SelectOption[]>(() =>
  kanbanStages.value.map((s) => ({ value: s.chave, label: s.label })),
)
</script>

<template>
  <div>
    <p v-if="triggerType === 'greeting'" class="text-xs text-text-muted">
      Dispara quando a mensagem inteira é uma saudação pura (ex.: "oi", "bom dia").
    </p>

    <p v-else-if="triggerType === 'first_message'" class="text-xs text-text-muted">
      Dispara na primeira mensagem que o cliente já mandou na vida.
    </p>

    <UiTextarea
      v-else-if="triggerType === 'keyword'"
      :model-value="keywordsText"
      label="Palavras-chave (separadas por vírgula)"
      placeholder="cardápio, menu, horário"
      :rows="2"
      @update:model-value="emit('update:keywordsText', $event)"
    />

    <div v-else-if="triggerType === 'kanban_stage'">
      <label class="block text-xs font-semibold text-text-primary mb-1.5">Etapa do Kanban</label>
      <p class="text-xs text-text-muted mb-2">
        Dispara quando o pedido do cliente entra nesta coluna — as mesmas colunas (e nomes) do quadro em Vendas,
        incluindo as que você criou ou renomeou.
      </p>
      <UiSelect
        :model-value="kanbanStageKey"
        :options="kanbanStageOptions"
        :disabled="loadingStages"
        placeholder="Selecione a etapa..."
        @update:model-value="(v) => emit('update:kanbanStageKey', v as string | null)"
      />
      <p v-if="!loadingStages && stagesLoaded && kanbanStageOptions.length === 0" class="text-xs text-warning-600 dark:text-warning-400 mt-1.5">
        Nenhuma coluna encontrada no Kanban de pedidos.
      </p>
    </div>
  </div>
</template>
