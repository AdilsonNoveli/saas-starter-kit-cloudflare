<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { Clock, MapPin } from '@lucide/vue'
import type { StoreScheduleConfig, StoreFechadaConfig } from '#shared/types/store'

definePageMeta({ layout: false })

interface StoreStatusResponse {
  isOpen: boolean
  statusOperacao: string
  mensagem: string
  whatsapp_atendimento: string
  nome_fantasia: string
  logomarca: string | null
  logomarca_dark: string | null
  config_horarios: StoreScheduleConfig | null
  config_loja_fechada: StoreFechadaConfig | null
  config_layout: {
    brand_color?: string
    brand_hover_color?: string
    border_radius?: 'none' | 'sm' | 'md' | 'lg' | 'full'
  } | null
  endereco: string | null
}

const { data: loja } = await useAsyncData<StoreStatusResponse>('store-closed-status', () =>
  $fetch<StoreStatusResponse>('/api/store/status'),
)

const catalogStyles = computed(() => {
  const layout = loja.value?.config_layout
  if (!layout) return {}
  const s: Record<string, string> = {}
  if (layout.brand_color) {
    s['--color-brand'] = layout.brand_color
    s['--color-brand-green'] = layout.brand_color
  }
  if (layout.brand_hover_color) {
    s['--color-brand-hover'] = layout.brand_hover_color
    s['--color-brand-greenDark'] = layout.brand_hover_color
  }
  if (layout.border_radius) {
    const cardRadiusMap: Record<string, string> = {
      none: '0px',
      sm: '6px',
      md: '12px',
      lg: '20px',
      full: '20px',
    }
    const btnRadiusMap: Record<string, string> = {
      none: '0px',
      sm: '4px',
      md: '8px',
      lg: '12px',
      full: '9999px',
    }
    s['--catalog-radius'] = cardRadiusMap[layout.border_radius] || '12px'
    s['--catalog-btn-radius'] = btnRadiusMap[layout.border_radius] || '8px'
  }
  return s
})

useHead({
  title: computed(() => loja.value?.nome_fantasia ? `${loja.value.nome_fantasia} — Fechado` : 'Loja Fechada'),
})

const cfg = computed<StoreFechadaConfig>(() => ({
  titulo: '',
  mensagem_custom: '',
  mostrar_horarios: true,
  mostrar_whatsapp: true,
  mostrar_endereco: false,
  mostrar_pagina_fechada: true,
  mostrar_faixa_fechada: true,
  imagem_url: '',
  ...(loja.value?.config_loja_fechada ?? {}),
}))

const hasCustomImage = computed(() => {
  return !!(cfg.value.imagem_url && cfg.value.imagem_url.trim())
})

const isPausada = computed(() => loja.value?.statusOperacao === 'pausada')

const titulo = computed(() =>
  cfg.value.titulo.trim() ||
  (isPausada.value ? 'Estamos de pausa' : 'Estamos fechados'),
)

const mensagem = computed(() => {
  if (cfg.value.mensagem_custom.trim()) return cfg.value.mensagem_custom.trim()
  if (isPausada.value) return 'Voltamos em breve. Agradecemos a compreensão.'
  return loja.value?.mensagem || 'No momento não estamos aceitando novos pedidos.'
})

const diasCompletos = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
] as const

const hojeIndex = new Date().getDay()

const hoje = computed(() => {
  const config = loja.value?.config_horarios
  if (!config) return null
  const key = String(hojeIndex) as keyof StoreScheduleConfig
  const dia = config[key]
  return {
    label: diasCompletos[hojeIndex]!,
    aberto: dia?.aberto ?? false,
    inicio: dia?.inicio ?? '00:00',
    fim: dia?.fim ?? '23:59',
  }
})

const whatsappUrl = computed(() => {
  const numero = (loja.value?.whatsapp_atendimento ?? '').replace(/\D/g, '')
  if (!numero) return null
  return `https://wa.me/${numero}?text=${encodeURIComponent('Olá! Quero saber quando a loja estará disponível.')}`
})

let pollInterval: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  if (loja.value?.isOpen || !cfg.value.mostrar_pagina_fechada) {
    navigateTo('/catalog')
    return
  }

  // Poll status every 10 seconds to automatically bring user back when store opens
  pollInterval = setInterval(async () => {
    try {
      const res = await $fetch<StoreStatusResponse>('/api/store/status')
      if (res.isOpen || !(res.config_loja_fechada?.mostrar_pagina_fechada ?? true)) {
        navigateTo('/catalog')
      }
    } catch {
      // ignore
    }
  }, 10000)
})

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval)
  }
})
</script>

<template>
  <div class="min-h-screen bg-surface font-sans flex flex-col antialiased" :style="catalogStyles">

    <!-- Conteúdo central: Card Estilo Enterprise (Zero Sombra & Zero SVG Placeholder) -->
    <main class="flex-1 flex items-center justify-center px-4 py-8 max-w-lg mx-auto w-full">
      <div class="w-full bg-surface border border-border rounded-2xl overflow-hidden transition-all">

        <!-- Topo com Imagem Personalizada (exibido SOMENTE se imagem_url estiver configurada) -->
        <div
          v-if="hasCustomImage"
          class="h-48 md:h-52 w-full bg-surface-raised/40 border-b border-border/40 flex items-center justify-center p-6 select-none relative overflow-hidden"
        >
          <!-- Badge de Status Flutuante sobre a imagem -->
          <span
            class="absolute top-4 right-4 inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full"
            :class="isPausada
              ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'"
          >
            <span
              class="w-2 h-2 rounded-full animate-pulse"
              :class="isPausada ? 'bg-amber-500' : 'bg-red-500'"
            />
            {{ isPausada ? 'Pausado' : 'Fechado' }}
          </span>

          <img
            :src="cfg.imagem_url!.trim()"
            alt="Loja Fechada"
            class="max-h-36 max-w-[220px] object-contain transition-transform duration-300 hover:scale-105"
            loading="eager"
          >
        </div>

        <!-- Conteúdo do Card -->
        <div class="p-6 md:p-8 space-y-6 text-center">
          <!-- Badge de Status no corpo do card (se NÃO houver imagem personalizada) -->
          <div v-if="!hasCustomImage" class="flex justify-center mb-1">
            <span
              class="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 rounded-full"
              :class="isPausada
                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'"
            >
              <span
                class="w-2 h-2 rounded-full animate-pulse"
                :class="isPausada ? 'bg-amber-500' : 'bg-red-500'"
              />
              {{ isPausada ? 'Pausado' : 'Fechado' }}
            </span>
          </div>
          <div>
            <p class="text-[11px] font-extrabold uppercase tracking-widest text-brand-green mb-1">
              {{ loja?.nome_fantasia }}
            </p>
            <h1 class="text-2xl md:text-3xl font-bold text-text-primary tracking-tight leading-snug">
              {{ titulo }}
            </h1>
            <p class="text-sm text-text-muted leading-relaxed mt-2.5 max-w-sm mx-auto">
              {{ mensagem }}
            </p>
          </div>

          <!-- Grade de Horário de Hoje (Configurado em Página Loja Fechada -> mostrar_horarios) -->
          <div
            v-if="cfg.mostrar_horarios && hoje"
            class="bg-surface-raised/50 border border-border/70 rounded-xl p-4 text-left space-y-1.5"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <Clock class="w-4 h-4 text-brand-green" />
                <span class="text-xs font-bold text-text-primary uppercase tracking-wider">Hoje ({{ hoje.label }})</span>
              </div>
              <span
                class="text-xs font-bold px-2.5 py-1 rounded-md"
                :class="hoje.aberto
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-surface text-text-muted border border-border'"
              >
                {{ hoje.aberto ? `${hoje.inicio} às ${hoje.fim}` : 'Fechado hoje' }}
              </span>
            </div>
          </div>

          <!-- Endereço Físico (Configurado em Página Loja Fechada -> mostrar_endereco) -->
          <div
            v-if="cfg.mostrar_endereco && loja?.endereco"
            class="flex items-start gap-3 p-3.5 bg-surface-raised/40 border border-border/60 rounded-xl text-left"
          >
            <MapPin class="w-4.5 h-4.5 text-brand-green shrink-0 mt-0.5" />
            <div>
              <span class="block text-[10px] font-bold text-text-secondary uppercase tracking-wider">Endereço da Loja</span>
              <span class="text-xs text-text-muted leading-relaxed block mt-0.5">{{ loja.endereco }}</span>
            </div>
          </div>

          <!-- Botão WhatsApp (Configurado em Página Loja Fechada -> mostrar_whatsapp) -->
          <div v-if="cfg.mostrar_whatsapp && whatsappUrl" class="pt-2">
            <a
              :href="whatsappUrl"
              target="_blank"
              class="w-full py-3.5 px-5 rounded-xl bg-[#25D366] hover:bg-[#22c55e] text-white font-bold text-sm tracking-wide transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Falar no WhatsApp
            </a>
          </div>

        </div>

      </div>
    </main>

    <!-- Footer mínimo -->
    <footer class="px-6 py-4 border-t border-border/40 text-center shrink-0">
      <p class="text-xs text-text-muted">
        &copy; {{ new Date().getFullYear() }} {{ loja?.nome_fantasia }}
      </p>
    </footer>

  </div>
</template>
