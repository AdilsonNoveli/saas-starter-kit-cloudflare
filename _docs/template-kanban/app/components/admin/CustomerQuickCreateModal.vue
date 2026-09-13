<!--
  @descricao: Modal de cadastro rápido de cliente para o PDV (/admin/orders/new).
  @objetivo: Permitir criar um cliente sem sair do PDV quando a busca não o
    encontra. Coleta o mínimo (nome + WhatsApp), insere com is_visitante=false
    (cliente real de balcão, não lead) e devolve a linha criada para seleção
    imediata. Reusa UiModal — herda tokens semânticos e dark mode.
-->

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { z } from 'zod'
import { useNotification } from '~/composables/useNotification'

/** Cliente devolvido ao PDV — mesmo shape da busca (ClienteRow) para seleção direta. */
export interface QuickCreatedCustomer {
  readonly id: string
  readonly nome: string
  readonly telefone_whatsapp: string
  readonly is_visitante: boolean
}

const props = defineProps<{
  readonly open: boolean
  /** Texto já digitado na busca do PDV — pré-preenche nome ou WhatsApp. */
  readonly prefill?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'created', cliente: QuickCreatedCustomer): void
}>()

const supabase = useSupabaseClient()
const { notify } = useNotification()

const nome = ref<string>('')
const telefone = ref<string>('')
const saving = ref<boolean>(false)
const nomeInput = ref<HTMLInputElement | null>(null)

const schema = z.object({
  nome: z.string().trim().min(1, 'Informe o nome do cliente.').max(200),
  telefone_whatsapp: z.string().trim().min(5, 'Informe um WhatsApp válido.').max(50),
})

/** Se o texto digitado começa com dígito, tratamos como telefone; senão, nome. */
function applyPrefill(raw: string | undefined): void {
  const value = (raw ?? '').trim()
  if (!value) { nome.value = ''; telefone.value = ''; return }
  if (/^[\d\s()+-]+$/.test(value)) {
    telefone.value = value
    nome.value = ''
  } else {
    nome.value = value
    telefone.value = ''
  }
}

// Reseta e pré-preenche a cada abertura; foca o primeiro campo relevante.
watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    applyPrefill(props.prefill)
    saving.value = false
    await nextTick()
    nomeInput.value?.focus()
  },
  { immediate: true },
)

function handleClose(): void {
  if (saving.value) return
  emit('close')
}

async function handleSubmit(): Promise<void> {
  if (saving.value) return

  const parsed = schema.safeParse({ nome: nome.value, telefone_whatsapp: telefone.value })
  if (!parsed.success) {
    notify.error('Campos inválidos', parsed.error.issues[0]?.message)
    return
  }

  saving.value = true
  const { data, error } = await supabase
    .from('customers')
    // is_guest=false: cadastro manual de balcão é cliente real, não lead.
    .insert({ name: parsed.data.nome, whatsapp_phone: parsed.data.telefone_whatsapp, is_guest: false })
    .select('id, nome:name, telefone_whatsapp:whatsapp_phone, is_visitante:is_guest')
    .single()

  if (error) {
    // 23505 = unique_violation no telefone_whatsapp (cliente já existe).
    const isDuplicate = (error as { code?: string }).code === '23505'
    notify.error(
      isDuplicate ? 'WhatsApp já cadastrado' : 'Erro ao criar cliente',
      isDuplicate
        ? 'Já existe um cliente com este WhatsApp. Busque-o pelo nome ou número.'
        : error.message,
    )
    saving.value = false
    return
  }

  saving.value = false
  notify.success('Cliente cadastrado', data.nome)
  emit('created', data as QuickCreatedCustomer)
}
</script>

<template>
  <UiModal :open="open" title="Novo Cliente" size="sm" @update:open="(v) => !v && handleClose()">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <div>
        <label for="qc-nome" class="block text-sm font-semibold text-text-secondary mb-1.5">Nome *</label>
        <input
          id="qc-nome"
          ref="nomeInput"
          v-model="nome"
          type="text"
          autocomplete="off"
          placeholder="João da Silva"
          class="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
        >
      </div>
      <div>
        <label for="qc-whatsapp" class="block text-xs font-semibold text-text-secondary mb-1.5">WhatsApp *</label>
        <input
          id="qc-whatsapp"
          v-model="telefone"
          type="tel"
          autocomplete="off"
          placeholder="5511999999999"
          class="w-full px-3.5 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
        >
      </div>
      <!-- Submit implícito: Enter em qualquer campo dispara o cadastro (fluxo balcão). -->
      <button type="submit" class="hidden" aria-hidden="true" tabindex="-1" />
    </form>

    <template #footer>
      <button
        type="button"
        class="px-4 py-2 rounded-lg border border-border text-xs font-bold uppercase tracking-wider text-text-primary bg-surface hover:bg-surface-raised transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        :disabled="saving"
        @click="handleClose"
      >
        Cancelar
      </button>
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        :disabled="saving"
        @click="handleSubmit"
      >
        <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {{ saving ? 'Salvando…' : 'Cadastrar e Selecionar' }}
      </button>
    </template>
  </UiModal>
</template>
