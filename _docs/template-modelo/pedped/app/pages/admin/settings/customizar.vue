<script setup lang="ts">
/**
 * @descricao: Aba "Aparência" das configurações da loja.
 * @objetivo: Logomarcas, tema do painel, cores/raio do catálogo, banner, botão
 *   flutuante do WhatsApp e a página de loja fechada.
 *
 * Grava só a fatia desta aba. Os três JSON que ela edita são relidos do banco
 * imediatamente antes do UPDATE e mesclados chave a chave — `config_promocoes`
 * em especial é compartilhado com `/admin/promotions` (campanha de Frete
 * Grátis), e aqui só `mostrar_miniaturas_card` pertence a esta tela.
 */
import { ref, onMounted } from 'vue'
import { Sun, Moon, Monitor, Layout, Eye, Palette, PowerOff, MessageCircle, Square } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'
import { useTheme } from '~/composables/useTheme'
import { useLojaConfig } from '~/composables/useLojaConfig'

const supabase = useSupabaseClient()
const { notify } = useNotification()
const { setTheme } = useTheme()
const { salvarFatia } = useLojaConfig()

const loading = ref<boolean>(true)
const saving = ref<boolean>(false)

interface ConfigLayout {
  brand_color?: string
  brand_hover_color?: string
  header_bg_color?: string
  header_buttons_bg_color?: string
  header_buttons_text_color?: string
  layout_categoria?: 'nome' | 'card'
  border_radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  banner_hero_url?: string
  whatsapp_flutuante_ativo?: boolean
  whatsapp_flutuante_texto?: string
}

interface ConfigLojaFechada {
  titulo: string
  mensagem_custom: string
  mostrar_horarios: boolean
  mostrar_whatsapp: boolean
  mostrar_endereco: boolean
  mostrar_pagina_fechada: boolean
  mostrar_faixa_fechada: boolean
  imagem_url?: string
}

interface FormAparencia {
  logomarca: string
  logomarca_dark: string
  tema_catalogo: 'light' | 'dark' | 'system'
  mostrar_miniaturas_card: boolean
  config_loja_fechada: ConfigLojaFechada
  config_layout: ConfigLayout
}

const form = ref<FormAparencia>({
  logomarca: '',
  logomarca_dark: '',
  tema_catalogo: 'system',
  mostrar_miniaturas_card: false,
  config_loja_fechada: {
    titulo: '',
    mensagem_custom: '',
    mostrar_horarios: true,
    mostrar_whatsapp: true,
    mostrar_endereco: false,
    mostrar_pagina_fechada: true,
    mostrar_faixa_fechada: true,
    imagem_url: '',
  },
  config_layout: {
    brand_color: '',
    brand_hover_color: '',
    header_bg_color: '',
    header_buttons_bg_color: '',
    header_buttons_text_color: '',
    layout_categoria: 'nome',
    border_radius: 'md',
    banner_hero_url: '',
    whatsapp_flutuante_ativo: true,
    whatsapp_flutuante_texto: 'Tire suas dúvidas!',
  },
})

onMounted(async () => {
  loading.value = true

  const { data, error } = await supabase
    .from('loja')
    .select('logomarca, logomarca_dark, tema_catalogo, config_promocoes, config_loja_fechada, config_layout')
    .limit(1)
    .maybeSingle()

  if (error && error.code !== 'PGRST116') {
    notify.error('Erro ao carregar configurações', error.message)
  }
  if (data) {
    const promocoes = (data.config_promocoes as Record<string, unknown> | null) ?? {}
    form.value = {
      logomarca: data.logomarca ?? '',
      logomarca_dark: data.logomarca_dark ?? '',
      tema_catalogo: (data.tema_catalogo as 'light' | 'dark' | 'system') ?? 'system',
      mostrar_miniaturas_card: (promocoes.mostrar_miniaturas_card as boolean | undefined) ?? false,
      config_loja_fechada: {
        ...form.value.config_loja_fechada,
        ...(data.config_loja_fechada as Record<string, unknown> | null ?? {}),
      },
      config_layout: {
        ...form.value.config_layout,
        ...(data.config_layout as Record<string, unknown> | null ?? {}),
      },
    }
  }

  loading.value = false
})

async function save(): Promise<void> {
  saving.value = true

  // Releitura imediatamente antes do UPDATE: os três JSON podem ter chaves
  // gravadas por outras telas (`config_promocoes` é a mais óbvia — a campanha
  // de Frete Grátis vive em `/admin/promotions`) e escrever o objeto local
  // inteiro as apagaria.
  const { data: fresh } = await supabase
    .from('loja')
    .select('config_promocoes, config_loja_fechada, config_layout')
    .limit(1)
    .maybeSingle()

  const promocoesFresh = (fresh?.config_promocoes as Record<string, unknown> | null) ?? {}
  const fechadaFresh = (fresh?.config_loja_fechada as Record<string, unknown> | null) ?? {}
  const layoutFresh = (fresh?.config_layout as Record<string, unknown> | null) ?? {}

  const erro = await salvarFatia({
    logomarca: form.value.logomarca,
    logomarca_dark: form.value.logomarca_dark,
    tema_catalogo: form.value.tema_catalogo,
    config_promocoes: {
      ...promocoesFresh,
      mostrar_miniaturas_card: form.value.mostrar_miniaturas_card,
    },
    config_loja_fechada: { ...fechadaFresh, ...form.value.config_loja_fechada },
    config_layout: { ...layoutFresh, ...form.value.config_layout },
  })

  saving.value = false

  if (erro) {
    notify.error('Erro ao salvar', erro)
    return
  }
  notify.success('Configurações salvas')
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center">
    <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="animate-fade-in">
      <div class="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 class="text-lg font-bold text-text-primary mb-0.5">Aparência</h2>
          <p class="text-xs text-text-muted">Personalize a identidade visual, recursos visuais do catálogo e comportamentos do sistema.</p>
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

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <!-- COLUNA DA ESQUERDA: Configurações (7/12) -->
        <div class="lg:col-span-7 space-y-6">

          <!-- Logomarcas da Loja -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Layout class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Logomarcas da Loja</h3>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <!-- Modo Claro -->
              <div class="flex flex-col items-center p-4 border border-border rounded bg-surface transition-all hover:border-gray-300">
                <span class="block text-[11px] font-black text-text-secondary uppercase tracking-widest mb-3">Tema Claro</span>
                <ImageUploader
                  v-model="form.logomarca"
                  bucket="loja"
                  placeholder-text="Logo (Claro)"
                  shape="square"
                  custom-class="h-[70px] w-[200px] rounded border border-border bg-white"
                  :hide-url-input="true"
                />
                <p class="text-[10px] text-text-muted mt-2 text-center">Exibido em fundo claro<br>200 × 70 px recomendado</p>
              </div>

              <!-- Modo Escuro -->
              <div class="flex flex-col items-center p-4 border border-border rounded bg-surface transition-all hover:border-gray-300">
                <span class="block text-[11px] font-black text-text-secondary uppercase tracking-widest mb-3">Tema Escuro</span>
                <ImageUploader
                  v-model="form.logomarca_dark"
                  bucket="loja"
                  placeholder-text="Logo (Escuro)"
                  shape="square"
                  custom-class="h-[70px] w-[200px] rounded border border-border bg-white"
                  :hide-url-input="true"
                />
                <p class="text-[10px] text-text-muted mt-2 text-center">Exibido em fundo escuro<br>200 × 70 px recomendado</p>
              </div>
            </div>
          </div>

          <!-- Preferências de Tema do Painel -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Sun class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Tema do Painel</h3>
            </div>

            <div class="grid grid-cols-3 gap-3">
              <button
                type="button"
                class="flex flex-col items-center justify-center p-3.5 rounded border text-center transition-all gap-1.5 cursor-pointer relative"
                :class="form.tema_catalogo === 'light'
                  ? 'border-brand-green bg-brand-green/[0.04] text-text-primary font-semibold ring-1 ring-brand-green/20'
                  : 'border-border text-text-muted hover:border-gray-400 hover:text-text-primary bg-surface'"
                @click="form.tema_catalogo = 'light'; setTheme('light')"
              >
                <Sun class="w-4.5 h-4.5" />
                <span class="text-[10px] font-bold uppercase tracking-wider">Claro</span>
                <span v-if="form.tema_catalogo === 'light'" class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-green rounded-full" />
              </button>

              <button
                type="button"
                class="flex flex-col items-center justify-center p-3.5 rounded border text-center transition-all gap-1.5 cursor-pointer relative"
                :class="form.tema_catalogo === 'dark'
                  ? 'border-brand-green bg-brand-green/[0.04] text-text-primary font-semibold ring-1 ring-brand-green/20'
                  : 'border-border text-text-muted hover:border-gray-400 hover:text-text-primary bg-surface'"
                @click="form.tema_catalogo = 'dark'; setTheme('dark')"
              >
                <Moon class="w-4.5 h-4.5" />
                <span class="text-[10px] font-bold uppercase tracking-wider">Escuro</span>
                <span v-if="form.tema_catalogo === 'dark'" class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-green rounded-full" />
              </button>

              <button
                type="button"
                class="flex flex-col items-center justify-center p-3.5 rounded border text-center transition-all gap-1.5 cursor-pointer relative"
                :class="form.tema_catalogo === 'system'
                  ? 'border-brand-green bg-brand-green/[0.04] text-text-primary font-semibold ring-1 ring-brand-green/20'
                  : 'border-border text-text-muted hover:border-gray-400 hover:text-text-primary bg-surface'"
                @click="form.tema_catalogo = 'system'; setTheme('system')"
              >
                <Monitor class="w-4.5 h-4.5" />
                <span class="text-[10px] font-bold uppercase tracking-wider">Auto</span>
                <span v-if="form.tema_catalogo === 'system'" class="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-brand-green rounded-full" />
              </button>
            </div>
            <p class="text-[10px] text-text-muted text-center border-t border-border/40 pt-2.5">Aparência da sua área administrativa.</p>
          </div>

          <!-- Recursos Visuais do Catálogo -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Eye class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Recursos do Catálogo</h3>
            </div>

            <!-- Visual das Categorias -->
            <div class="flex items-center justify-between gap-4 p-3 border border-border rounded bg-surface">
              <div class="flex-1">
                <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Categorias em Formato de Card</h4>
                <p class="text-[11px] text-text-muted mt-0.5">Se ativado, exibe as categorias como cartões com imagem; caso contrário, exibe apenas os nomes.</p>
              </div>
              <UiToggle
                :model-value="form.config_layout.layout_categoria === 'card'"
                size="sm"
                @update:model-value="(val) => { form.config_layout.layout_categoria = val ? 'card' : 'nome' }"
              />
            </div>

            <!-- Galeria de Miniaturas nos Cards -->
            <div class="flex items-center justify-between gap-4 p-3 border border-border rounded bg-surface">
              <div class="flex-1">
                <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Galeria de Miniaturas (Desktop)</h4>
                <p class="text-[11px] text-text-muted mt-0.5">Exibe fotos extras na lateral esquerda do card de produto no catálogo desktop para navegação.</p>
              </div>
              <UiToggle v-model="form.mostrar_miniaturas_card" size="sm" />
            </div>
          </div>

          <!-- Botão Flutuante do WhatsApp -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <MessageCircle class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Botão Flutuante do WhatsApp</h3>
            </div>

            <div class="space-y-4">
              <!-- Toggle do Botão -->
              <div class="flex items-center justify-between gap-4 p-3 border border-border rounded bg-surface">
                <div class="flex-1">
                  <h4 class="text-xs font-bold text-text-primary uppercase tracking-wider">Exibir Botão do WhatsApp no Catálogo</h4>
                  <p class="text-[11px] text-text-muted mt-0.5">Exibe o botão flutuante de atendimento no canto inferior direito do catálogo.</p>
                </div>
                <UiToggle
                  :model-value="form.config_layout.whatsapp_flutuante_ativo ?? true"
                  size="sm"
                  @update:model-value="(v: boolean) => (form.config_layout.whatsapp_flutuante_ativo = v)"
                />
              </div>

              <!-- Texto do Hover (Tooltip) -->
              <div class="flex flex-col gap-1.5 p-3 border border-border rounded bg-surface">
                <label for="cfg-whats-tooltip" class="text-xs font-bold text-text-primary uppercase tracking-wider">Frase do Hover (Tooltip)</label>
                <input
                  id="cfg-whats-tooltip"
                  v-model="form.config_layout.whatsapp_flutuante_texto"
                  type="text"
                  class="w-full px-3 py-2 border border-border rounded bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-green text-sm"
                  placeholder="Tire suas dúvidas!"
                >
                <p class="text-[10px] text-text-muted mt-0.5">Texto customizável que aparece quando o cliente passa o mouse sobre o botão.</p>
              </div>
            </div>
          </div>

          <!-- Banner Principal (Hero) -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Layout class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Banner Principal (Hero)</h3>
            </div>

            <div class="flex flex-col items-center p-4 border border-border rounded bg-surface transition-all hover:border-gray-300">
              <ImageUploader
                v-model="form.config_layout.banner_hero_url"
                bucket="loja"
                placeholder-text="Banner Principal (Hero)"
                shape="square"
                custom-class="w-full h-[180px] rounded-lg border border-border bg-white"
                :hide-url-input="true"
              />
              <p class="text-[10px] text-text-muted mt-2 text-center">Exibido na página inicial do catálogo</p>
            </div>
            <p class="text-[10px] text-text-muted text-center border-t border-border/40 pt-2.5">Adicione um banner de destaque. Recomendado: largura de 1920px por 600px a 900px de altura.</p>
          </div>

          <!-- Página Loja Fechada -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <PowerOff class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Página Loja Fechada</h3>
            </div>

            <div class="space-y-4">
              <!-- Uploader da Imagem Customizada -->
              <div class="flex flex-col items-center p-4 border border-border rounded bg-surface transition-all hover:border-gray-300">
                <span class="block text-[11px] font-bold text-text-secondary uppercase tracking-wider mb-2">Imagem Personalizada da Página Fechada</span>
                <ImageUploader
                  v-model="form.config_loja_fechada.imagem_url"
                  bucket="loja"
                  placeholder-text="Upload Imagem Loja Fechada"
                  shape="square"
                  custom-class="w-full h-[140px] rounded-lg border border-border bg-white"
                  :hide-url-input="true"
                />
                <p class="text-[10px] text-text-muted mt-2 text-center">Arraste e solte para adicionar uma imagem à página de loja fechada (opcional).</p>
              </div>

              <!-- Título customizado -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Título da Página</label>
                <input
                  v-model="form.config_loja_fechada.titulo"
                  type="text"
                  class="w-full px-3 py-2 border border-border rounded bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-green text-sm"
                  placeholder="Estamos Fechados"
                >
              </div>

              <!-- Mensagem customizada -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Mensagem Explicativa</label>
                <textarea
                  v-model="form.config_loja_fechada.mensagem_custom"
                  rows="2.5"
                  class="w-full px-3 py-2 border border-border rounded bg-surface text-text-primary placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-brand-green text-sm resize-none"
                  placeholder="No momento não estamos aceitando novos pedidos..."
                />
              </div>

              <!-- Switches de exibição -->
              <div class="border border-border rounded bg-surface divide-y divide-border">
                <div class="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold text-text-primary">Mostrar Horários de Funcionamento</p>
                    <p class="text-[10px] text-text-muted">Exibe a grade semanal completa de abertura</p>
                  </div>
                  <UiToggle v-model="form.config_loja_fechada.mostrar_horarios" size="sm" />
                </div>

                <div class="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold text-text-primary">Mostrar Botão de WhatsApp</p>
                    <p class="text-[10px] text-text-muted">Permite ao cliente clicar para falar direto com o atendimento</p>
                  </div>
                  <UiToggle v-model="form.config_loja_fechada.mostrar_whatsapp" size="sm" />
                </div>

                <div class="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold text-text-primary">Mostrar Endereço Físico</p>
                    <p class="text-[10px] text-text-muted">Exibe o endereço cadastrado da loja</p>
                  </div>
                  <UiToggle v-model="form.config_loja_fechada.mostrar_endereco" size="sm" />
                </div>

                <div class="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold text-text-primary">Ativar Página de Bloqueio Geral</p>
                    <p class="text-[10px] text-text-muted">Redireciona para tela de fechado (se desativado, catálogo continua visível mas carrinho bloqueia)</p>
                  </div>
                  <UiToggle v-model="form.config_loja_fechada.mostrar_pagina_fechada" size="sm" />
                </div>

                <div class="px-3.5 py-2.5 flex items-center justify-between">
                  <div>
                    <p class="text-xs font-semibold text-text-primary">Mostrar Faixa de Aviso no Catálogo</p>
                    <p class="text-[10px] text-text-muted">Adiciona uma barra superior indicando o horário de abertura</p>
                  </div>
                  <UiToggle v-model="form.config_loja_fechada.mostrar_faixa_fechada" size="sm" />
                </div>
              </div>
              <p class="text-[10px] text-text-muted text-center border-t border-border/40 pt-2.5 mt-4">O que exibir para os clientes quando a loja estiver fechada ou pausada.</p>
            </div>
          </div>

        </div>

        <!-- COLUNA DA DIREITA: Cores e Live Preview (5/12) -->
        <div class="lg:col-span-5 space-y-6 lg:sticky lg:top-4">

          <!-- Customização de Cores -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Palette class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Cores do Catálogo</h3>
            </div>

            <div class="space-y-4">

              <!-- Cor de Destaque / Marca -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cor de Destaque / Marca</label>
                <div class="flex gap-2">
                  <div class="relative flex items-center">
                    <input
                      :value="form.config_layout.brand_color || '#22b573'"
                      type="color"
                      class="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
                      @input="(e) => { const v = (e.target as HTMLInputElement).value; form.config_layout.brand_color = v }"
                    >
                  </div>
                  <input
                    v-model="form.config_layout.brand_color"
                    type="text"
                    class="flex-1 px-3 py-1.5 border border-border rounded bg-surface text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-green"
                    placeholder="#22b573 (padrão)"
                  >
                </div>
              </div>

              <!-- Cor de Destaque Hover -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Cor de Destaque Hover</label>
                <div class="flex gap-2">
                  <div class="relative flex items-center">
                    <input
                      :value="form.config_layout.brand_hover_color || '#1da065'"
                      type="color"
                      class="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
                      @input="(e) => { const v = (e.target as HTMLInputElement).value; form.config_layout.brand_hover_color = v }"
                    >
                  </div>
                  <input
                    v-model="form.config_layout.brand_hover_color"
                    type="text"
                    class="flex-1 px-3 py-1.5 border border-border rounded bg-surface text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-green"
                    placeholder="#1da065 (padrão)"
                  >
                </div>
              </div>

              <!-- Fundo do Cabeçalho -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Fundo do Cabeçalho</label>
                <div class="flex gap-2">
                  <div class="relative flex items-center">
                    <input
                      :value="form.config_layout.header_bg_color || '#ffffff'"
                      type="color"
                      class="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
                      @input="(e) => { const v = (e.target as HTMLInputElement).value; form.config_layout.header_bg_color = v }"
                    >
                  </div>
                  <input
                    v-model="form.config_layout.header_bg_color"
                    type="text"
                    class="flex-1 px-3 py-1.5 border border-border rounded bg-surface text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-green"
                    placeholder="#ffffff (padrão)"
                  >
                </div>
              </div>

              <!-- Fundo dos Elementos -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Fundo dos Elementos</label>
                <div class="flex gap-2">
                  <div class="relative flex items-center">
                    <input
                      :value="form.config_layout.header_buttons_bg_color || '#f3f4f6'"
                      type="color"
                      class="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
                      @input="(e) => { const v = (e.target as HTMLInputElement).value; form.config_layout.header_buttons_bg_color = v }"
                    >
                  </div>
                  <input
                    v-model="form.config_layout.header_buttons_bg_color"
                    type="text"
                    class="flex-1 px-3 py-1.5 border border-border rounded bg-surface text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-green"
                    placeholder="#f3f4f6 (padrão)"
                  >
                </div>
              </div>

              <!-- Texto e Ícones do Cabeçalho -->
              <div class="flex flex-col gap-1.5">
                <label class="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Texto e Ícones do Cabeçalho</label>
                <div class="flex gap-2">
                  <div class="relative flex items-center">
                    <input
                      :value="form.config_layout.header_buttons_text_color || '#111827'"
                      type="color"
                      class="h-9 w-12 rounded border border-border bg-transparent p-0.5 cursor-pointer shrink-0"
                      @input="(e) => { const v = (e.target as HTMLInputElement).value; form.config_layout.header_buttons_text_color = v }"
                    >
                  </div>
                  <input
                    v-model="form.config_layout.header_buttons_text_color"
                    type="text"
                    class="flex-1 px-3 py-1.5 border border-border rounded bg-surface text-text-primary text-xs font-mono focus:outline-none focus:ring-1 focus:ring-brand-green"
                    placeholder="#111827 (padrão)"
                  >
                </div>
              </div>

            </div>

            <!-- Ação: Restaurar padrões -->
            <div class="pt-2 flex justify-end">
              <button
                type="button"
                class="text-[11px] font-semibold text-text-muted hover:text-brand-green underline transition-colors cursor-pointer"
                @click="form.config_layout = { ...form.config_layout, brand_color: '', brand_hover_color: '', header_bg_color: '', header_buttons_bg_color: '', header_buttons_text_color: '', border_radius: 'md' }"
              >
                Restaurar cores padrão
              </button>
            </div>
          </div>

          <!-- RAIO DAS BORDAS -->
          <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
            <div class="flex items-center gap-2 border-b border-border pb-3">
              <Square class="w-4.5 h-4.5 text-brand-green" />
              <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">RAIO DAS BORDAS</h3>
            </div>

            <div class="space-y-3">
              <p class="text-xs text-text-muted leading-relaxed">
                Ajuste o grau de arredondamento das bordas de todos os cartões, botões e campos no catálogo.
              </p>

              <div class="grid grid-cols-5 gap-2.5">
                <button
                  v-for="opt in [
                    { value: 'none', label: 'Reto' },
                    { value: 'sm', label: 'Suave' },
                    { value: 'md', label: 'Padrão' },
                    { value: 'lg', label: 'Curvo' },
                    { value: 'full', label: 'Pílula' },
                  ]"
                  :key="opt.value"
                  type="button"
                  class="w-full h-9.5 px-1.5 flex items-center justify-center rounded border transition-all cursor-pointer select-none"
                  :class="(form.config_layout.border_radius || 'md') === opt.value
                    ? 'border-brand-green bg-brand-green/[0.06] text-brand-green font-medium ring-1 ring-brand-green/20'
                    : 'border-border text-text-muted hover:border-gray-400 hover:text-text-primary bg-surface font-normal'"
                  @click="form.config_layout.border_radius = opt.value as 'none' | 'sm' | 'md' | 'lg' | 'full'"
                >
                  <span class="text-[9.5px] uppercase tracking-wider text-center leading-none">{{ opt.label }}</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  </main>
</template>
