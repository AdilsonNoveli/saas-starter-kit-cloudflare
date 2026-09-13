<script setup lang="ts">
/**
 * @descricao: Aba "Negócio" das configurações da loja.
 * @objetivo: Identidade, endereço, logística e horários — a fatia de `loja` que
 *   esta página, e só ela, grava (§8.19 de `_docs/em-andamento.md`).
 */
import { ref, onMounted } from 'vue'
import { Plus, Store, MapPin, Clock, Calendar, Truck, Compass, Route } from '@lucide/vue'
import AddressAutocomplete from '~/components/checkout/AddressAutocomplete.vue'
import type { AddressDetails, GeocodeResponse } from '#shared/types/maps'
import { useNotification } from '~/composables/useNotification'
import { useFormatters } from '~/composables/useFormatters'
import { useLojaConfig } from '~/composables/useLojaConfig'
import { getSaoPauloDateString } from '~~/shared/utils/datetime'
import type { DayScheduleConfig } from '~~/shared/types/store'

const supabase = useSupabaseClient()
const { notify } = useNotification()
const { formatCurrency } = useFormatters()
const { lerLojaId, salvarFatia, revalidarLoja } = useLojaConfig()

const loading = ref<boolean>(true)
const saving = ref<boolean>(false)

/** Opções de status mapeadas ao enum do banco (5.9.1 — decisão técnica 11). */
const statusOptions = [
  { value: 'automatico', label: 'Seguir horário programado', desc: 'Respeita a grade abaixo' },
  { value: 'aberta', label: 'Aberto agora', desc: 'Força aberto hoje, ignora grade' },
  { value: 'pausada', label: 'Pausado', desc: 'Pausa temporária (ex.: fila cheia)' },
  { value: 'fechada', label: 'Fechado hoje', desc: 'Fecha hoje, ignora grade' },
] as const

const diasSemana = [
  { index: '0', label: 'Domingo' },
  { index: '1', label: 'Segunda-feira' },
  { index: '2', label: 'Terça-feira' },
  { index: '3', label: 'Quarta-feira' },
  { index: '4', label: 'Quinta-feira' },
  { index: '5', label: 'Sexta-feira' },
  { index: '6', label: 'Sábado' },
] as const

type DiaIndex = '0' | '1' | '2' | '3' | '4' | '5' | '6'

/** `DayScheduleConfig` é `readonly`; o formulário edita os campos por `v-model`. */
interface DiaEditavel { aberto: boolean, inicio: string, fim: string }

const defaultHorarios: Record<DiaIndex, DiaEditavel> = {
  '0': { aberto: true, inicio: '00:00', fim: '23:59' },
  '1': { aberto: true, inicio: '00:00', fim: '23:59' },
  '2': { aberto: true, inicio: '00:00', fim: '23:59' },
  '3': { aberto: true, inicio: '00:00', fim: '23:59' },
  '4': { aberto: true, inicio: '00:00', fim: '23:59' },
  '5': { aberto: true, inicio: '00:00', fim: '23:59' },
  '6': { aberto: true, inicio: '00:00', fim: '23:59' },
}

interface FormNegocio {
  trade_name: string
  cnpj: string
  pix_key: string
  support_whatsapp_number: string
  address_street: string
  address_number: string
  address_neighborhood: string
  address_city: string
  address_state: string
  address_zip_code: string
  origin_latitude: number | null
  origin_longitude: number | null
  service_radius_km: number
  default_delivery_fee: number
  allows_pickup: boolean
  operation_status: string
  status_override_date: string | null
  hours_config: Record<DiaIndex, DiaEditavel>
}

const form = ref<FormNegocio>({
  trade_name: '',
  cnpj: '',
  pix_key: '',
  support_whatsapp_number: '',
  address_street: '',
  address_number: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip_code: '',
  origin_latitude: null,
  origin_longitude: null,
  service_radius_km: 5,
  default_delivery_fee: 0,
  allows_pickup: false,
  operation_status: 'automatico',
  status_override_date: null,
  hours_config: {
    '0': { ...defaultHorarios['0'] },
    '1': { ...defaultHorarios['1'] },
    '2': { ...defaultHorarios['2'] },
    '3': { ...defaultHorarios['3'] },
    '4': { ...defaultHorarios['4'] },
    '5': { ...defaultHorarios['5'] },
    '6': { ...defaultHorarios['6'] },
  },
})

// ============= REGRAS DE FRETE =============
// Tabela própria (`shipping_distance_rules`), com "Salvar regras" próprio desde
// antes do split — continua independente do "Salvar Alterações" da aba.

interface FreteRule {
  id?: string
  min_distance_km: number
  max_distance_km: number
  shipping_fee: number
  active: boolean
  sort_order: number
}

const freteRules = ref<FreteRule[]>([])
const freteSaving = ref(false)

async function loadFreteRules(): Promise<void> {
  const { data } = await supabase
    .from('shipping_distance_rules')
    .select('id, min_distance_km, max_distance_km, shipping_fee, active, sort_order')
    .order('sort_order')
  freteRules.value = (data ?? []).map((r) => ({
    id: r.id,
    min_distance_km: Number(r.min_distance_km),
    max_distance_km: Number(r.max_distance_km),
    shipping_fee: Number(r.shipping_fee),
    active: r.active,
    sort_order: r.sort_order,
  }))
}

function addFreteRule(): void {
  const last = freteRules.value[freteRules.value.length - 1]
  const minKm = last?.max_distance_km ?? 0
  freteRules.value.push({
    min_distance_km: minKm,
    max_distance_km: minKm + 5,
    shipping_fee: 0,
    active: true,
    sort_order: freteRules.value.length,
  })
}

async function saveFreteRules(): Promise<void> {
  for (let i = 0; i < freteRules.value.length; i++) {
    const r = freteRules.value[i]!
    if (r.min_distance_km >= r.max_distance_km) {
      notify.error('Faixa inválida', `Regra ${i + 1}: distância mínima deve ser menor que máxima.`)
      return
    }
  }

  freteSaving.value = true

  const { error: delErr } = await supabase
    .from('shipping_distance_rules')
    .delete()
    .gte('min_distance_km', 0)

  if (delErr) {
    freteSaving.value = false
    notify.error('Erro ao salvar regras', delErr.message)
    return
  }

  if (freteRules.value.length > 0) {
    const toInsert = freteRules.value.map(({ id: _id, ...rest }, idx) => ({ ...rest, sort_order: idx }))
    const { error: insErr } = await supabase.from('shipping_distance_rules').insert(toInsert)
    if (insErr) {
      freteSaving.value = false
      notify.error('Erro ao salvar regras', insErr.message)
      await loadFreteRules()
      return
    }
  }

  freteSaving.value = false
  await loadFreteRules()
  notify.success('Regras de frete salvas')
}

/** Snapshot do endereço no load para detectar mudança antes de geocodificar. */
const addressSnapshot = ref<string>('')

// ── Autocomplete de endereço via BFF (/api/maps/*) ──────────────────────────
function onPlaceSelected(d: AddressDetails): void {
  form.value.origin_latitude = d.lat
  form.value.origin_longitude = d.lng
  if (d.rua) form.value.address_street = d.rua
  if (d.numero) form.value.address_number = d.numero
  if (d.bairro) form.value.address_neighborhood = d.bairro
  if (d.cidade) form.value.address_city = d.cidade
  if (d.uf) form.value.address_state = d.uf
  if (d.cep) form.value.address_zip_code = d.cep
  addressSnapshot.value = getAddressKey()
}

function getAddressKey(): string {
  return [
    form.value.address_street,
    form.value.address_number,
    form.value.address_neighborhood,
    form.value.address_city,
    form.value.address_state,
  ].join('|')
}

/** Geocodifica o endereço via BFF (/api/maps/geocode) — chave privada no servidor. */
async function geocodeAddress(): Promise<void> {
  const address = [
    form.value.address_street,
    form.value.address_number,
    form.value.address_neighborhood,
    form.value.address_city,
    form.value.address_state,
    'Brasil',
  ].filter(Boolean).join(', ')
  if (!address.trim() || address === 'Brasil') return

  try {
    const res = await $fetch<GeocodeResponse>('/api/maps/geocode', { params: { address } })
    form.value.origin_latitude = res.lat
    form.value.origin_longitude = res.lng
  } catch {
    // Geocoding é best-effort
  }
}

onMounted(async () => {
  loading.value = true

  const [lojaResult] = await Promise.all([
    supabase
      .from('store')
      .select('trade_name, cnpj, pix_key, support_whatsapp_number, address_street, address_number, address_neighborhood, address_city, address_state, address_zip_code, origin_latitude, origin_longitude, service_radius_km, default_delivery_fee, allows_pickup, operation_status, status_override_date, hours_config')
      .limit(1)
      .maybeSingle(),
    loadFreteRules(),
  ])

  if (lojaResult.error && lojaResult.error.code !== 'PGRST116') {
    notify.error('Erro ao carregar configurações', lojaResult.error.message)
  }
  if (lojaResult.data) {
    const data = lojaResult.data
    // `hours_config` chega como `Json` do Postgres: shape não garantido em
    // tempo de compilação. `Partial<DayScheduleConfig>` diz a verdade (o dia
    // pode vir incompleto e o spread completa com o default) sem `any`, que
    // este repositório proíbe.
    const horariosSalvos = data.hours_config as Partial<Record<string, Partial<DayScheduleConfig>>> | null
    form.value = {
      trade_name: data.trade_name ?? '',
      cnpj: data.cnpj ?? '',
      pix_key: data.pix_key ?? '',
      support_whatsapp_number: data.support_whatsapp_number ?? '',
      address_street: data.address_street ?? '',
      address_number: data.address_number ?? '',
      address_neighborhood: data.address_neighborhood ?? '',
      address_city: data.address_city ?? '',
      address_state: data.address_state ?? '',
      address_zip_code: data.address_zip_code ?? '',
      origin_latitude: data.origin_latitude != null ? Number(data.origin_latitude) : null,
      origin_longitude: data.origin_longitude != null ? Number(data.origin_longitude) : null,
      service_radius_km: Number(data.service_radius_km ?? 5),
      default_delivery_fee: Number(data.default_delivery_fee ?? 0),
      allows_pickup: data.allows_pickup ?? false,
      operation_status: data.operation_status ?? 'automatico',
      status_override_date: data.status_override_date ?? null,
      hours_config: {
        '0': { ...defaultHorarios['0'], ...(horariosSalvos?.[0] ?? {}) },
        '1': { ...defaultHorarios['1'], ...(horariosSalvos?.[1] ?? {}) },
        '2': { ...defaultHorarios['2'], ...(horariosSalvos?.[2] ?? {}) },
        '3': { ...defaultHorarios['3'], ...(horariosSalvos?.[3] ?? {}) },
        '4': { ...defaultHorarios['4'], ...(horariosSalvos?.[4] ?? {}) },
        '5': { ...defaultHorarios['5'], ...(horariosSalvos?.[5] ?? {}) },
        '6': { ...defaultHorarios['6'], ...(horariosSalvos?.[6] ?? {}) },
      },
    }
    addressSnapshot.value = getAddressKey()
  }

  loading.value = false
})

async function save(): Promise<void> {
  saving.value = true

  // 5.9.2: geocodificar apenas se o endereço mudou
  if (getAddressKey() !== addressSnapshot.value) {
    await geocodeAddress()
    addressSnapshot.value = getAddressKey()
  }

  // Garante que o override manual de status use a data de hoje no fuso BRT
  form.value.status_override_date = form.value.operation_status === 'automatico'
    ? null
    : getSaoPauloDateString()

  // `hours_config` é o único JSON desta aba, mas vale a mesma disciplina das
  // outras: relê antes de gravar e só sobrescreve as chaves que esta tela edita.
  const { data: fresh } = await supabase.from('store').select('hours_config').limit(1).maybeSingle()
  const horariosFresh = (fresh?.hours_config as Record<string, unknown> | null) ?? {}

  const patch = {
    trade_name: form.value.trade_name,
    cnpj: form.value.cnpj,
    pix_key: form.value.pix_key,
    support_whatsapp_number: form.value.support_whatsapp_number,
    address_street: form.value.address_street,
    address_number: form.value.address_number,
    address_neighborhood: form.value.address_neighborhood,
    address_city: form.value.address_city,
    address_state: form.value.address_state,
    address_zip_code: form.value.address_zip_code,
    origin_latitude: form.value.origin_latitude,
    origin_longitude: form.value.origin_longitude,
    service_radius_km: form.value.service_radius_km,
    default_delivery_fee: form.value.default_delivery_fee,
    allows_pickup: form.value.allows_pickup,
    operation_status: form.value.operation_status,
    status_override_date: form.value.status_override_date,
    hours_config: { ...horariosFresh, ...form.value.hours_config },
  }

  // `store` é singleton (migration 102) e esta é a única aba que pode criá-la:
  // é a dona de `trade_name`, a única coluna obrigatória do INSERT. As
  // outras abas só atualizam — sem loja, elas não têm o que gravar.
  const id = await lerLojaId()
  if (!id) {
    if (!form.value.trade_name.trim()) {
      notify.warning('Informe o nome fantasia', 'É o mínimo para cadastrar a loja.')
      saving.value = false
      return
    }
    const { error } = await supabase.from('store').insert([patch])
    if (error) {
      notify.error('Erro ao salvar', error.message)
      saving.value = false
      return
    }
    await revalidarLoja()
  } else {
    const erro = await salvarFatia(patch)
    if (erro) {
      notify.error('Erro ao salvar', erro)
      saving.value = false
      return
    }
  }

  saving.value = false
  notify.success('Configurações salvas')
}
</script>

<template>
  <div v-if="loading" class="flex-1 flex items-center justify-center">
    <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
  </div>

  <main v-else class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <div class="flex justify-end mb-6">
      <button
        type="button"
        class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs cursor-pointer active:scale-95"
        :disabled="saving"
        @click="save"
      >
        <span v-if="saving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        {{ saving ? 'Salvando…' : 'Salvar Alterações' }}
      </button>
    </div>

    <section class="space-y-6">

      <!-- Card 1: Identidade da Loja -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <Store class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Identidade da Loja</h3>
        </div>

        <div class="space-y-4">
          <div>
            <label for="cfg-nome" class="block text-xs font-semibold text-text-secondary mb-1.5">Nome Fantasia *</label>
            <input
              id="cfg-nome"
              v-model="form.trade_name"
              type="text"
              class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all placeholder:text-text-muted"
              placeholder="Ex: Minha Loja"
            >
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label for="cfg-whats" class="block text-xs font-semibold text-text-secondary mb-1.5">WhatsApp Atendimento</label>
              <input
                id="cfg-whats"
                v-model="form.support_whatsapp_number"
                type="text"
                class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all placeholder:text-text-muted"
                placeholder="Ex: 5511999999999"
              >
            </div>
            <div>
              <label for="cfg-cnpj" class="block text-xs font-semibold text-text-secondary mb-1.5">CNPJ (Opcional)</label>
              <input
                id="cfg-cnpj"
                v-model="form.cnpj"
                type="text"
                class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all placeholder:text-text-muted"
                placeholder="00.000.000/0001-00"
              >
            </div>
            <div>
              <label for="cfg-pix" class="block text-xs font-semibold text-text-secondary mb-1.5">Chave PIX</label>
              <input
                id="cfg-pix"
                v-model="form.pix_key"
                type="text"
                class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all placeholder:text-text-muted"
                placeholder="E-mail, CPF, celular…"
              >
            </div>
          </div>
        </div>
      </div>

      <!-- Card 2: Endereço da Loja -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <MapPin class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Endereço da Loja</h3>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-text-muted leading-relaxed">
            Usado como origem para o cálculo do raio de entrega.
            <span v-if="form.origin_latitude" class="font-semibold text-text-primary"> Geocodificado: {{ form.origin_latitude.toFixed(5) }}, {{ form.origin_longitude?.toFixed(5) }}.</span>
            <span v-else class="text-amber-600 font-semibold"> Selecione na lista de sugestões para confirmar a localização.</span>
          </p>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
            <!-- Buscador de Endereço -->
            <div class="md:col-span-4">
              <label class="block text-xs font-semibold text-text-secondary mb-1.5">Buscar Endereço</label>
              <AddressAutocomplete
                placeholder="Digite o endereço da loja e selecione na lista"
                @select="onPlaceSelected"
              />
              <p class="text-[10px] text-text-muted mt-1">Digite para buscar e selecione na lista — os campos abaixo serão preenchidos automaticamente.</p>
            </div>

            <div class="md:col-span-3">
              <label for="cfg-rua" class="block text-xs font-semibold text-text-secondary mb-1.5">Rua / Logradouro</label>
              <input id="cfg-rua" v-model="form.address_street" type="text" class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all">
            </div>
            <div>
              <label for="cfg-numero" class="block text-xs font-semibold text-text-secondary mb-1.5">Número</label>
              <input id="cfg-numero" v-model="form.address_number" type="text" class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all">
            </div>

            <div class="md:col-span-2">
              <label for="cfg-bairro" class="block text-xs font-semibold text-text-secondary mb-1.5">Bairro</label>
              <input id="cfg-bairro" v-model="form.address_neighborhood" type="text" class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all">
            </div>
            <div class="md:col-span-2">
              <label for="cfg-cidade" class="block text-xs font-semibold text-text-secondary mb-1.5">Cidade</label>
              <input id="cfg-cidade" v-model="form.address_city" type="text" class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all">
            </div>

            <div>
              <label for="cfg-uf" class="block text-xs font-semibold text-text-secondary mb-1.5">UF</label>
              <input id="cfg-uf" v-model="form.address_state" type="text" maxlength="2" class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all uppercase">
            </div>
            <div class="md:col-span-3">
              <label for="cfg-cep" class="block text-xs font-semibold text-text-secondary mb-1.5">CEP</label>
              <input id="cfg-cep" v-model="form.address_zip_code" type="text" class="w-full px-3 py-2 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all">
            </div>
          </div>
        </div>
      </div>

      <!-- Card 3: Raio de Atendimento -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center justify-between gap-4 border-b border-border pb-3">
          <div class="flex items-center gap-2">
            <Compass class="w-4.5 h-4.5 text-brand-green" />
            <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Raio de Atendimento</h3>
          </div>
          <span class="text-xl font-bold text-text-primary tabular-nums">{{ form.service_radius_km || 5 }}<span class="text-sm font-medium text-text-muted ml-1">km</span></span>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-text-muted leading-relaxed">Pedidos de entrega com endereço de entrega fora desse raio (calculado a partir da coordenada da loja) serão automaticamente recusados.</p>
          <div>
            <input
              id="cfg-raio"
              v-model.number="form.service_radius_km"
              type="range"
              min="1"
              max="50"
              step="0.5"
              class="w-full accent-brand-green cursor-pointer"
            >
            <div class="flex justify-between text-xs text-text-muted mt-1 select-none">
              <span>1 km</span>
              <span>25 km</span>
              <span>50 km</span>
            </div>
          </div>

          <div class="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <button
              v-for="km in [3, 5, 10, 15, 20, 30]"
              :key="km"
              type="button"
              class="py-1.5 rounded text-xs font-semibold border transition-colors cursor-pointer"
              :class="form.service_radius_km === km
                ? 'bg-brand-green text-white border-brand-green shadow-sm'
                : 'bg-surface text-text-muted border-border hover:border-brand-green hover:text-brand-green'"
              @click="form.service_radius_km = km"
            >
              {{ km }} km
            </button>
          </div>
        </div>
      </div>

      <!-- Card 4: Taxa de Entrega Padrão -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <Truck class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Taxa de Entrega Padrão</h3>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-text-muted leading-relaxed">Valor cobrado por padrão em pedidos de entrega. Use R$ 0,00 para frete grátis.</p>
          <div>
            <label for="cfg-taxa" class="block text-xs font-semibold text-text-secondary mb-1.5">Valor Padrão (R$)</label>
            <div class="relative max-w-xs">
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-muted pointer-events-none">R$</span>
              <input
                id="cfg-taxa"
                v-model.number="form.default_delivery_fee"
                type="number"
                step="0.50"
                min="0"
                class="w-full pl-9 pr-4 py-2 rounded-md border border-border bg-surface text-text-primary text-sm font-medium focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                placeholder="0,00"
              >
            </div>
            <p class="text-xs text-text-muted mt-2">
              Valor atual configurado: <span class="font-semibold text-text-primary">{{ formatCurrency(form.default_delivery_fee || 0) }}</span>
            </p>
          </div>
        </div>
      </div>

      <!-- Card 5: Retirada no Local -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <MapPin class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Retirada no Local</h3>
        </div>

        <div class="flex items-center justify-between gap-4 p-4 rounded-md border border-border bg-surface">
          <div class="flex-1">
            <h4 class="font-bold text-text-primary text-sm leading-none">Permitir Retirada no Local</h4>
            <p class="text-xs text-text-secondary mt-1.5 leading-relaxed">
              Permite que os clientes optem por retirar o pedido diretamente no balcão da loja, isento de qualquer taxa de frete. Quando desativado, apenas entrega domiciliar fica disponível no checkout.
            </p>
          </div>
          <div class="shrink-0">
            <UiToggle v-model="form.allows_pickup" size="sm" />
          </div>
        </div>
      </div>

      <!-- Card 6: Regras de Frete por Distância -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <Route class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Regras de Frete por Distância</h3>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-text-muted leading-relaxed">
            Define valores específicos por faixa de km. Se o endereço de entrega do cliente não englobar nenhuma das regras ativas abaixo, será cobrada a Taxa de Entrega Padrão configurada.
          </p>

          <div class="border border-border rounded-md overflow-hidden bg-surface">
            <table class="w-full text-left text-xs">
              <thead>
                <tr class="text-[10px] font-bold text-text-muted uppercase tracking-wider bg-surface-raised border-b border-border">
                  <th class="px-4 py-2.5">De (km)</th>
                  <th class="px-4 py-2.5">Até (km)</th>
                  <th class="px-4 py-2.5">Frete (R$)</th>
                  <th class="px-4 py-2.5 text-center">Ativo</th>
                  <th class="px-4 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody class="divide-y divide-border/60">
                <tr
                  v-for="(rule, i) in freteRules"
                  :key="i"
                  class="hover:bg-surface-raised/40 transition-colors"
                >
                  <td class="px-4 py-2">
                    <input
                      v-model.number="rule.min_distance_km"
                      type="number"
                      step="0.5"
                      min="0"
                      class="w-20 px-2.5 py-1.5 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-xs text-center"
                    >
                  </td>
                  <td class="px-4 py-2">
                    <input
                      v-model.number="rule.max_distance_km"
                      type="number"
                      step="0.5"
                      min="0"
                      class="w-20 px-2.5 py-1.5 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-xs text-center"
                    >
                  </td>
                  <td class="px-4 py-2">
                    <div class="flex items-center gap-1">
                      <span class="text-text-muted text-xs font-semibold">R$</span>
                      <input
                        v-model.number="rule.shipping_fee"
                        type="number"
                        step="0.50"
                        min="0"
                        class="w-24 px-2.5 py-1.5 border border-border rounded bg-surface focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-xs font-medium"
                      >
                    </div>
                  </td>
                  <td class="px-4 py-2 text-center">
                    <UiToggle v-model="rule.active" size="sm" />
                  </td>
                  <td class="px-4 py-2 text-right">
                    <button
                      type="button"
                      class="p-1.5 rounded text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-950/20 transition-colors active:scale-95 cursor-pointer"
                      title="Remover faixa"
                      @click="freteRules.splice(i, 1)"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
                <tr v-if="freteRules.length === 0">
                  <td colspan="5" class="px-4 py-6 text-center text-xs text-text-muted italic bg-surface-raised/20">
                    Nenhuma faixa configurada — será usada a Taxa Padrão para todos os pedidos.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              type="button"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded border border-border text-xs font-bold uppercase tracking-wider hover:bg-surface-raised transition-colors active:scale-95 cursor-pointer bg-surface"
              @click="addFreteRule"
            >
              <Plus class="w-4 h-4" />
              Adicionar faixa
            </button>
            <button
              type="button"
              :disabled="freteSaving"
              class="px-4 py-2 rounded bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50 transition-colors active:scale-95 cursor-pointer shadow-xs"
              @click="saveFreteRules"
            >
              {{ freteSaving ? 'Salvando…' : 'Salvar regras' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Card 7: Modo de Operação -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <Clock class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Modo de Operação</h3>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-text-muted leading-relaxed">Selecione o comportamento operacional atual da loja. O modo automático obedece à grade semanal.</p>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <button
              v-for="opt in statusOptions"
              :key="opt.value"
              type="button"
              class="flex flex-col items-start p-4 rounded-lg border text-left transition-colors cursor-pointer"
              :class="form.operation_status === opt.value
                ? 'border-brand-green bg-brand-green/[0.04] text-text-primary'
                : 'border-border text-text-muted hover:border-border-strong hover:text-text-primary bg-surface'"
              @click="form.operation_status = opt.value; form.status_override_date = opt.value !== 'automatico' ? getSaoPauloDateString() : null"
            >
              <span class="text-sm font-bold">{{ opt.label }}</span>
              <span class="text-xs mt-1 opacity-70 leading-snug">{{ opt.desc }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Card 8: Grade Semanal -->
      <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <Calendar class="w-4.5 h-4.5 text-brand-green" />
          <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Grade Semanal</h3>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-text-muted leading-relaxed">Grade semanal ativa quando o modo de operação estiver em automático.</p>

          <div class="border border-border rounded-lg bg-surface divide-y divide-border/60 overflow-hidden">
            <div
              v-for="dia in diasSemana"
              :key="dia.index"
              class="flex flex-col sm:flex-row items-start sm:items-center p-4 gap-4"
            >
              <div class="w-full sm:w-44 flex items-center gap-3 shrink-0">
                <UiToggle
                  :model-value="form.hours_config[dia.index]?.aberto ?? false"
                  size="sm"
                  @update:model-value="(v) => { if (form.hours_config[dia.index]) form.hours_config[dia.index].aberto = v }"
                />
                <span
                  class="text-sm font-semibold"
                  :class="form.hours_config[dia.index]?.aberto ? 'text-text-primary' : 'text-text-muted line-through'"
                >
                  {{ dia.label }}
                </span>
              </div>
              <div
                class="flex items-center gap-3 transition-opacity"
                :class="!form.hours_config[dia.index]?.aberto && 'opacity-30 pointer-events-none'"
              >
                <label :for="`inicio-${dia.index}`" class="sr-only">Abertura {{ dia.label }}</label>
                <input
                  :id="`inicio-${dia.index}`"
                  v-model="form.hours_config[dia.index].inicio"
                  type="time"
                  class="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                >
                <span class="text-text-muted text-sm font-medium">até</span>
                <label :for="`fim-${dia.index}`" class="sr-only">Fechamento {{ dia.label }}</label>
                <input
                  :id="`fim-${dia.index}`"
                  v-model="form.hours_config[dia.index].fim"
                  type="time"
                  class="px-3 py-1.5 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green"
                >
              </div>
              <div class="sm:ml-auto">
                <span
                  v-if="form.hours_config[dia.index]?.aberto"
                  class="text-xs font-bold text-brand-green uppercase tracking-wider"
                >Aberto</span>
                <span v-else class="text-xs font-bold text-red-500 uppercase tracking-wider">Fechado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
