<script setup lang="ts">
/**
 * @descricao: Aba "Agente IA" das configurações da loja.
 * @objetivo: Modelos da OpenAI, chave da API, ligar/desligar o agente, pausa por
 *   resposta humana, mídia recebida, instruções extras e capacidades.
 */
import { ref, onMounted } from 'vue'
import { useNotification } from '~/composables/useNotification'
import { useLojaConfig } from '~/composables/useLojaConfig'
import { OPENAI_CONVERSATIONAL_MODELS, OPENAI_JUDGE_MODELS } from '~~/shared/types/agent'
import type { OpenAiModelOption } from '~~/shared/types/agent'

const supabase = useSupabaseClient()
const { notify, confirm } = useNotification()
const { salvarFatia } = useLojaConfig()

const loading = ref<boolean>(true)
const saving = ref<boolean>(false)

/**
 * Nomes amigáveis das 9 tools do agente (nunca o nome técnico da função) —
 * `server/utils/agent/tools/*.ts` é a fonte da verdade dos nomes técnicos,
 * seção 8 da arquitetura do agente WhatsApp exige o texto amigável na UI.
 */
const AGENT_TOOLS = [
  { name: 'BuscarProdutos', label: 'Buscar produtos e preços' },
  { name: 'DefinirItemCarrinho', label: 'Adicionar/alterar itens no carrinho' },
  { name: 'ConsultarEnderecoEntrega', label: 'Consultar endereço e taxa de entrega' },
  { name: 'AtualizarPedido', label: 'Atualizar dados do pedido (entrega, pagamento, endereço)' },
  { name: 'FinalizarPedido', label: 'Finalizar o pedido' },
  { name: 'ConsultarDetalhePedido', label: 'Consultar um pedido já feito' },
  { name: 'EnviarBotaoCatalogo', label: 'Enviar o botão do catálogo digital' },
  { name: 'ConsultarDatasEncomenda', label: 'Consultar datas disponíveis de encomenda' },
  { name: 'AtualizarContexto', label: 'Lembrar preferências do cliente' },
  { name: 'ConsultarOpcoesProduto', label: 'Consultar opções/variações do produto (borda, sabor, tamanho...)' },
] as const

const DEFAULT_AGENT_TOOLS: string[] = AGENT_TOOLS.map((t) => t.name)
const AGENTE_INSTRUCOES_MAX = 800
const AGENTE_NOME_MAX = 60
const AGENTE_SAUDACAO_MAX = 200

interface FormAgente {
  agente_ativo: boolean
  agente_instrucoes_extra: string
  agente_nome: string
  agente_saudacao: string
  agente_tools_habilitadas: string[]
  agente_audio_habilitado: boolean
  agente_imagem_habilitado: boolean
  agente_modelo: string
  agente_modelo_avaliador: string
  agente_pausa_humana_ativo: boolean
  agente_pausa_humana_minutos: number
}

const form = ref<FormAgente>({
  agente_ativo: true,
  agente_instrucoes_extra: '',
  agente_nome: '',
  agente_saudacao: '',
  agente_tools_habilitadas: [...DEFAULT_AGENT_TOOLS],
  agente_audio_habilitado: true,
  agente_imagem_habilitado: true,
  agente_modelo: 'gpt-4.1-mini',
  agente_modelo_avaliador: 'gpt-4.1-mini',
  agente_pausa_humana_ativo: true,
  agente_pausa_humana_minutos: 15,
})

function toggleAgentTool(name: string): void {
  const list = form.value.agente_tools_habilitadas
  const idx = list.indexOf(name)
  if (idx === -1) list.push(name)
  else list.splice(idx, 1)
}

/**
 * ─── Catálogo de modelos ────────────────────────────────────────────────────
 *
 * `OPENAI_CONVERSATIONAL_MODELS`/`OPENAI_JUDGE_MODELS` são o fallback (chave
 * ainda não configurada, sem escopo `model.read`, ou falha de rede) e a fonte
 * do preço — a OpenAI não expõe preço por API. `/openai-key/models` cruza
 * esse catálogo com `GET /v1/models` da chave real e devolve só o que o
 * projeto de fato tem acesso hoje, para o select nunca oferecer um modelo já
 * desativado (o erro só apareceria depois, ao salvar).
 */
interface OpenAiModelsResponse {
  conversational: OpenAiModelOption[]
  judge: OpenAiModelOption[]
  disponibilidadeConfirmada: boolean
}

const modelosConversacionais = ref<OpenAiModelOption[]>([...OPENAI_CONVERSATIONAL_MODELS])
const modelosAvaliador = ref<OpenAiModelOption[]>([...OPENAI_JUDGE_MODELS])
const modelosConfirmadosNaOpenAi = ref(false)

async function loadOpenAiModels(): Promise<void> {
  try {
    const res = await $fetch<OpenAiModelsResponse>('/api/admin/integrations/openai-key/models')
    modelosConversacionais.value = res.conversational
    modelosAvaliador.value = res.judge
    modelosConfirmadosNaOpenAi.value = res.disponibilidadeConfirmada
  } catch {
    // Lista é best-effort — o catálogo estático dos refs acima já cobre a tela.
  }
}

onMounted(async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('store')
    .select('agent_active, agent_extra_instructions, agent_name, agent_greeting, agent_enabled_tools, agent_audio_enabled, agent_image_enabled, agent_model, agent_evaluator_model, agent_human_pause_active, agent_human_pause_minutes')
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    notify.error('Erro ao carregar configurações', error.message)
  }
  if (data) {
    form.value = {
      agente_ativo: data.agent_active ?? true,
      agente_instrucoes_extra: data.agent_extra_instructions ?? '',
      agente_nome: data.agent_name ?? '',
      agente_saudacao: data.agent_greeting ?? '',
      agente_tools_habilitadas: (data.agent_enabled_tools as string[] | null) ?? [...DEFAULT_AGENT_TOOLS],
      agente_audio_habilitado: data.agent_audio_enabled ?? true,
      agente_imagem_habilitado: data.agent_image_enabled ?? true,
      agente_modelo: data.agent_model ?? 'gpt-4.1-mini',
      agente_modelo_avaliador: data.agent_evaluator_model ?? 'gpt-4.1-mini',
      agente_pausa_humana_ativo: data.agent_human_pause_active ?? true,
      agente_pausa_humana_minutos: Number(data.agent_human_pause_minutes ?? 15),
    }
  }

  loading.value = false
  void loadOpenAiStatus()
  void loadOpenAiModels()
})

async function save(): Promise<void> {
  if (form.value.agente_instrucoes_extra.length > AGENTE_INSTRUCOES_MAX) {
    notify.warning('Instruções muito longas', `Limite de ${AGENTE_INSTRUCOES_MAX} caracteres para as instruções adicionais do agente.`)
    return
  }
  if (form.value.agente_nome.length > AGENTE_NOME_MAX) {
    notify.warning('Nome muito longo', `Limite de ${AGENTE_NOME_MAX} caracteres para o nome do agente.`)
    return
  }
  if (form.value.agente_saudacao.length > AGENTE_SAUDACAO_MAX) {
    notify.warning('Saudação muito longa', `Limite de ${AGENTE_SAUDACAO_MAX} caracteres para a frase de saudação.`)
    return
  }
  if (form.value.agente_pausa_humana_minutos < 1 || form.value.agente_pausa_humana_minutos > 1440) {
    notify.warning('Pausa inválida', 'A pausa por resposta humana deve estar entre 1 e 1440 minutos (24h).')
    return
  }

  saving.value = true

  const erro = await salvarFatia({
    agent_active: form.value.agente_ativo,
    agent_extra_instructions: form.value.agente_instrucoes_extra,
    agent_name: form.value.agente_nome.trim() || null,
    agent_greeting: form.value.agente_saudacao.trim() || null,
    agent_enabled_tools: form.value.agente_tools_habilitadas,
    agent_audio_enabled: form.value.agente_audio_habilitado,
    agent_image_enabled: form.value.agente_imagem_habilitado,
    agent_model: form.value.agente_modelo,
    agent_evaluator_model: form.value.agente_modelo_avaliador,
    agent_human_pause_active: form.value.agente_pausa_humana_ativo,
    agent_human_pause_minutes: form.value.agente_pausa_humana_minutos,
  })

  saving.value = false

  if (erro) {
    notify.error('Erro ao salvar', erro)
    return
  }
  notify.success('Configurações salvas')
}

/**
 * ─── Chave da API OpenAI ────────────────────────────────────────────────────
 *
 * Passo 3 da §8.19: a gestão da chave morava em `/admin/integrations` e esta
 * tela só mostrava o status com um link "Gerenciar chave em Integrações →" —
 * mandava o usuário para outra página fazer o que devia estar aqui, ao lado dos
 * modelos que a chave paga. As rotas são as mesmas de antes
 * (`/api/admin/integrations/openai-key`), sem mudança de contrato: a chave é
 * validada contra a OpenAI, guardada no Vault e nunca devolvida em claro.
 */
const openaiConfigurado = ref(false)
const openaiMascara = ref<string | null>(null)
const openaiStatusLoading = ref(true)
const openaiSaving = ref(false)
const openaiRevoking = ref(false)
const openaiKeyInput = ref('')
const openaiModalOpen = ref(false)

async function loadOpenAiStatus(): Promise<void> {
  openaiStatusLoading.value = true
  try {
    const status = await $fetch<{ configurado: boolean, mascara: string | null, modelo: string }>(
      '/api/admin/integrations/openai-key/status',
    )
    openaiConfigurado.value = status.configurado
    openaiMascara.value = status.mascara
  } catch {
    // Status do card é best-effort — não bloqueia a tela
  } finally {
    openaiStatusLoading.value = false
  }
}

function openOpenaiModal(): void {
  openaiKeyInput.value = ''
  openaiModalOpen.value = true
}

async function saveOpenaiKey(): Promise<void> {
  const key = openaiKeyInput.value.trim()
  if (!key) {
    notify.warning('Chave obrigatória', 'Cole a chave da API OpenAI para salvar.')
    return
  }

  openaiSaving.value = true
  try {
    const result = await $fetch<{ configurado: boolean, mascara: string }>(
      '/api/admin/integrations/openai-key',
      { method: 'POST', body: { apiKey: key } },
    )
    openaiConfigurado.value = result.configurado
    openaiMascara.value = result.mascara
    openaiKeyInput.value = ''
    openaiModalOpen.value = false
    notify.success('Chave da OpenAI salva com sucesso!')
    void loadOpenAiModels()
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao salvar chave', message ?? 'Tente novamente.')
  } finally {
    openaiSaving.value = false
  }
}

async function revokeOpenaiKey(): Promise<void> {
  const ok = await confirm({
    title: 'Revogar chave da OpenAI?',
    message:
      'A chave será apagada do cofre e o atendente de IA para de responder no WhatsApp até você cadastrar outra. Não dá para desfazer.',
    confirmText: 'Revogar',
    cancelText: 'Cancelar',
    variant: 'error',
  })
  if (!ok) return

  openaiRevoking.value = true
  try {
    await $fetch('/api/admin/integrations/openai-key', { method: 'DELETE' })
    openaiConfigurado.value = false
    openaiMascara.value = null
    openaiKeyInput.value = ''
    openaiModalOpen.value = false
    modelosConversacionais.value = [...OPENAI_CONVERSATIONAL_MODELS]
    modelosAvaliador.value = [...OPENAI_JUDGE_MODELS]
    modelosConfirmadosNaOpenAi.value = false
    notify.success('Chave revogada', 'O atendente de IA ficará inativo até uma nova chave ser cadastrada.')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao revogar chave', message ?? 'Tente novamente.')
  } finally {
    openaiRevoking.value = false
  }
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center">
    <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="space-y-8">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-lg font-bold mb-1">Atendente de IA no WhatsApp</h2>
          <p class="text-sm text-text-muted">
            Configure a chave da OpenAI e os modelos do agente conversacional e do avaliador de qualidade.
          </p>
        </div>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95 shrink-0"
          :disabled="saving"
          @click="save"
        >
          <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ saving ? 'Salvando…' : 'Salvar Alterações' }}
        </button>
      </div>

      <!-- ── 1. PROVEDORES DE IA E CHAVES DE API (PRIMEIRO ITEM DE CONFIGURAÇÃO NO TOPO) ──── -->
      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Chave da API & Provedores de IA</h3>
          <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
            Selecione e configure a chave de API dos provedores de inteligência artificial.
          </p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <!-- Card 1: OpenAI (Já em produção) -->
          <div
            class="border border-border rounded-xl p-4 flex flex-col justify-between gap-3 cursor-pointer hover:border-brand-green/60 hover:shadow-md transition-all group bg-surface relative overflow-hidden"
            :class="{ 'opacity-60 pointer-events-none': openaiStatusLoading }"
            @click="openOpenaiModal"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-zinc-900 border border-zinc-700/60 p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/icons/openai.svg" alt="OpenAI" class="w-6 h-6 object-contain" >
              </div>
              <span
                v-if="openaiConfigurado"
                class="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Ativo
              </span>
              <span
                v-else
                class="inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-surface-raised text-text-muted border border-border"
              >
                <span class="w-1.5 h-1.5 rounded-full bg-text-muted shrink-0" />
                Inativo
              </span>
            </div>

            <div>
              <div class="flex items-center gap-1.5 flex-wrap">
                <h4 class="text-sm font-bold text-text-primary group-hover:text-brand-green transition-colors">OpenAI</h4>
                <span class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-brand-green/10 text-brand-green rounded border border-brand-green/20">Produção</span>
              </div>
              <p class="text-[11px] text-text-muted mt-1 leading-relaxed">
                Chave da API oficial da OpenAI (GPT-4o, GPT-4o-mini).
              </p>
            </div>

            <div class="pt-2 border-t border-border/60 flex items-center justify-between">
              <span v-if="openaiMascara" class="text-[10px] font-mono text-text-muted truncate block">
                {{ openaiMascara }}
              </span>
              <span v-else class="text-[10px] font-semibold text-brand-green group-hover:underline">
                Configurar chave →
              </span>
            </div>
          </div>

          <!-- Card 2: Google Gemini (Em breve) -->
          <div class="border border-border/70 rounded-xl p-4 flex flex-col justify-between gap-3 bg-surface/50 opacity-85 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2">
              <div class="w-10 h-10 rounded-xl bg-slate-950 dark:bg-slate-900 border border-slate-700/60 p-1.5 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/icons/Google-Gemini.svg" alt="Google Gemini" class="w-6 h-6 object-contain" >
              </div>
              <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                EM BREVE
              </span>
            </div>

            <div>
              <h4 class="text-sm font-bold text-text-primary">Google Gemini</h4>
              <p class="text-[11px] text-text-muted mt-1 leading-relaxed">
                Suporte nativo aos modelos Gemini Pro & Flash.
              </p>
            </div>

            <div class="pt-2 border-t border-border/40">
              <span class="text-[10px] text-text-muted italic">Integração futura</span>
            </div>
          </div>

          <!-- Card 3: Anthropic Claude (Em breve) -->
          <div class="border border-border/70 rounded-xl p-4 flex flex-col justify-between gap-3 bg-surface/50 opacity-85 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2">
              <div class="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-amber-900/30 bg-amber-950/20 p-0.5 flex items-center justify-center shadow-xs">
                <img src="/icons/Claude.jpg" alt="Claude" class="w-full h-full object-cover rounded-lg" >
              </div>
              <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                EM BREVE
              </span>
            </div>

            <div>
              <h4 class="text-sm font-bold text-text-primary">Claude</h4>
              <p class="text-[11px] text-text-muted mt-1 leading-relaxed">
                Modelos Anthropic Claude Sonnet & Haiku.
              </p>
            </div>

            <div class="pt-2 border-t border-border/40">
              <span class="text-[10px] text-text-muted italic">Integração futura</span>
            </div>
          </div>

          <!-- Card 4: OpenRouter (Em breve) -->
          <div class="border border-border/70 rounded-xl p-4 flex flex-col justify-between gap-3 bg-surface/50 opacity-85 relative overflow-hidden">
            <div class="flex items-start justify-between gap-2">
              <div class="w-10 h-10 rounded-xl bg-indigo-950 dark:bg-indigo-950 border border-indigo-700/60 p-2 flex items-center justify-center shrink-0 shadow-xs">
                <img src="/icons/OpenRoute.svg" alt="OpenRouter" class="w-6 h-6 object-contain" >
              </div>
              <span class="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                EM BREVE
              </span>
            </div>

            <div>
              <h4 class="text-sm font-bold text-text-primary">OpenRouter</h4>
              <p class="text-[11px] text-text-muted mt-1 leading-relaxed">
                Roteamento multi-modelo unificado via API.
              </p>
            </div>

            <div class="pt-2 border-t border-border/40">
              <span class="text-[10px] text-text-muted italic">Integração futura</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ── 2. MODELOS DE IA DO AGENTE ──── -->
      <div class="p-5 rounded-xl border border-border bg-surface space-y-6">
        <div class="border-b border-border pb-3">
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Modelos do Agente e Avaliador</h3>
          <p class="text-xs text-text-muted mt-1 leading-relaxed">
            Defina os modelos da OpenAI utilizados para o atendimento e para a análise de qualidade em segundo plano.
          </p>
          <p v-if="modelosConfirmadosNaOpenAi" class="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1.5 font-semibold">
            Disponibilidade confirmada agora com a sua chave da OpenAI.
          </p>
          <p v-else class="text-[10px] text-text-muted mt-1.5">
            Lista padrão — configure a chave da OpenAI acima para confirmar quais modelos o seu projeto tem liberado.
          </p>
        </div>

        <!-- Modelo Conversacional -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-text-primary uppercase tracking-wider">Modelo Conversacional</label>
          <UiSelect
            :model-value="form.agente_modelo"
            :options="modelosConversacionais.map((m: OpenAiModelOption) => ({ value: m.value, label: m.label }))"
            size="md"
            @update:model-value="(v) => { form.agente_modelo = v as string }"
          />
          <p class="text-[11px] text-text-muted">Modelo principal que responde às mensagens dos clientes no WhatsApp.</p>
        </div>

        <!-- Modelo Avaliador de Qualidade (LLM-as-a-Judge) -->
        <div class="space-y-1.5">
          <label class="block text-xs font-bold text-text-primary uppercase tracking-wider">Modelo Avaliador de Qualidade (LLM-as-a-Judge)</label>
          <UiSelect
            :model-value="form.agente_modelo_avaliador"
            :options="modelosAvaliador.map((m: OpenAiModelOption) => ({ value: m.value, label: m.label }))"
            size="md"
            @update:model-value="(v) => { form.agente_modelo_avaliador = v as string }"
          />
          <p class="text-[11px] text-text-muted">Modelo em segundo plano que avalia a qualidade do atendimento no Dashboard de IA (a cada 15 min).</p>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 p-4 rounded-lg border border-border bg-surface">
        <div class="flex-1">
          <p class="text-sm font-semibold text-text-primary">Agente ativo</p>
          <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
            Desligado, os clientes caem direto em atendimento humano — o agente não responde.
          </p>
        </div>
        <div class="shrink-0">
          <UiToggle v-model="form.agente_ativo" size="sm" />
        </div>
      </div>

      <!-- Pausa por resposta humana (migration 104 — §0.5.2 (a)(b) de
           _docs/em-andamento.md). Desligado, o atendente respondendo pelo
           app do celular nunca pausa o agente — os dois podem falar com o
           cliente ao mesmo tempo. -->
      <div class="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
        <div class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="flex-1">
            <p class="text-sm font-semibold text-text-primary">Pausar quando um atendente responder</p>
            <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
              Se alguém da loja responder pelo WhatsApp do celular uma conversa em andamento, o
              agente para de responder aquele cliente por um tempo.
            </p>
          </div>
          <div class="shrink-0">
            <UiToggle v-model="form.agente_pausa_humana_ativo" size="sm" />
          </div>
        </div>

        <div v-if="form.agente_pausa_humana_ativo" class="flex items-center justify-between gap-4 px-4 py-3">
          <div class="flex-1">
            <p class="text-sm font-semibold text-text-primary">Duração da pausa</p>
            <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
              Reinicia a cada nova mensagem do atendente; o agente volta sozinho quando o cliente
              escrever de novo, depois desse tempo sem resposta humana.
            </p>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <input
              v-model.number="form.agente_pausa_humana_minutos"
              type="number"
              min="1"
              max="1440"
              class="w-20 px-3 py-2 rounded-lg border border-border bg-surface text-sm text-center font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
            >
            <span class="text-xs text-text-muted font-medium">minutos</span>
          </div>
        </div>
      </div>

      <!-- Mídia recebida (migration 093). Desligar não é só cosmético: o
           agente responde uma recusa educada e pede o texto, então a frase
           precisa deixar claro que o cliente É avisado. -->
      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold text-text-primary mb-1">Mensagens de áudio e imagem</h3>
          <p class="text-xs text-text-muted leading-relaxed">
            Quando desligado, o agente avisa o cliente que não consegue ouvir/ver e pede que
            escreva — a mensagem nunca fica sem resposta.
          </p>
        </div>

        <div class="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="flex-1">
              <p class="text-sm font-semibold text-text-primary">Entender áudios</p>
              <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
                Transcreve o áudio do cliente e responde ao conteúdo dele.
              </p>
            </div>
            <div class="shrink-0">
              <UiToggle v-model="form.agente_audio_habilitado" size="sm" />
            </div>
          </div>

          <div class="flex items-center justify-between gap-4 px-4 py-3">
            <div class="flex-1">
              <p class="text-sm font-semibold text-text-primary">Entender imagens</p>
              <p class="text-xs text-text-muted mt-0.5 leading-relaxed">
                Lê a foto enviada — ex.: print do cardápio ou comprovante — e responde a partir dela.
              </p>
            </div>
            <div class="shrink-0">
              <UiToggle v-model="form.agente_imagem_habilitado" size="sm" />
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold text-text-primary mb-1">Identidade do agente</h3>
          <p class="text-xs text-text-muted leading-relaxed">
            Opcional. Com um nome, o agente se apresenta na primeira mensagem de cada cliente novo — nunca revela que é automação, continua se apresentando como atendente da loja.
          </p>
        </div>
        <div>
          <label for="agente-nome" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Nome do agente</label>
          <input
            id="agente-nome"
            v-model="form.agente_nome"
            type="text"
            :maxlength="AGENTE_NOME_MAX"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="Ex.: Marcos"
          >
        </div>
        <UiTextarea
          v-model="form.agente_saudacao"
          label="Frase de saudação (opcional)"
          placeholder="Ex.: Oi! Aqui é o Marcos, da Pizzaria do Zé 🍕"
          :rows="2"
          :maxlength="AGENTE_SAUDACAO_MAX"
          no-shadow
          helper-text="Vazio = o agente monta uma saudação padrão a partir do nome. Só aparece uma vez, no primeiro contato de cada cliente."
        />
      </div>

      <div class="space-y-2">
        <UiTextarea
          v-model="form.agente_instrucoes_extra"
          label="Instruções adicionais para o agente"
          placeholder="Ex.: priorize sempre oferecer o combo família. Fale sobre a promoção de terça-feira quando o cliente perguntar do cardápio."
          :rows="4"
          :maxlength="AGENTE_INSTRUCOES_MAX"
          no-shadow
          helper-text="Texto livre, usado como contexto de negócio — nunca substitui as regras de segurança e formato do agente."
        />
      </div>

      <div class="space-y-3">
        <div>
          <h3 class="text-sm font-semibold text-text-primary mb-1">Capacidades habilitadas</h3>
          <p class="text-xs text-text-muted leading-relaxed">
            Desligue o que não se aplica à sua loja — ex.: sem produto de encomenda, desligue
            "Consultar datas disponíveis de encomenda".
          </p>
        </div>

        <div class="border border-border rounded-lg bg-surface divide-y divide-border overflow-hidden">
          <div
            v-for="tool in AGENT_TOOLS"
            :key="tool.name"
            class="flex items-center gap-3 px-4 py-3"
          >
            <UiCheckbox
              :model-value="form.agente_tools_habilitadas.includes(tool.name)"
              :label="tool.label"
              @update:model-value="toggleAgentTool(tool.name)"
            />
          </div>
        </div>
      </div>
    </section>

    <!-- Modal Chave da API OpenAI -->
    <UiModal
      :open="openaiModalOpen"
      title="Configurar Atendente IA"
      size="md"
      @close="openaiModalOpen = false"
    >
      <form class="space-y-4" @submit.prevent="saveOpenaiKey">
        <div>
          <label for="openai-key" class="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">Chave da API OpenAI *</label>
          <input
            id="openai-key"
            v-model="openaiKeyInput"
            type="password"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
            placeholder="sk-..."
          >
          <p class="text-[10px] text-text-muted mt-1.5 leading-normal">
            <template v-if="openaiMascara">Chave atual: <code class="bg-surface-raised px-1 py-0.5 rounded border border-border/80">{{ openaiMascara }}</code>. Cole uma nova chave para substituí-la.</template>
            <template v-else>A chave é validada contra a OpenAI e guardada com criptografia (Supabase Vault) — nunca fica visível depois de salva.</template>
          </p>
        </div>

        <div class="bg-surface-raised p-3.5 rounded-lg border border-border space-y-2">
          <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Segurança</h4>
          <p class="text-xs text-text-muted leading-relaxed">
            A chave é criptografada em repouso (Supabase Vault) e validada contra a OpenAI antes
            de ser salva. Depois de salva, nunca mais é exibida — só a máscara acima.
          </p>
        </div>
      </form>

      <template #footer>
        <button
          v-if="openaiConfigurado"
          type="button"
          class="px-4 py-2 rounded-lg border border-danger-600/40 text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 mr-auto"
          :disabled="openaiRevoking || openaiSaving"
          @click="revokeOpenaiKey"
        >
          <span v-if="openaiRevoking" class="w-4 h-4 border-2 border-danger-600/30 border-t-danger-600 rounded-full animate-spin" />
          Revogar chave
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-sm font-medium active:scale-95"
          @click="openaiModalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 shadow-xs"
          :disabled="openaiSaving || openaiRevoking"
          @click="saveOpenaiKey"
        >
          <span v-if="openaiSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Salvar
        </button>
      </template>
    </UiModal>
  </main>
</template>
