<script setup lang="ts">
/**
 * Autocomplete de endereços via BFF (`/api/maps/*`).
 *
 * NÃO fala com a Google diretamente — não carrega o JS SDK nem usa chave no
 * cliente. Digita → GET /api/maps/autocomplete; seleciona → GET /api/maps/place.
 * Um `sessionToken` (UUID) agrupa a sessão de billing (autocomplete + details).
 */
import { ref, watch, onBeforeUnmount } from 'vue'
import type { AddressSuggestion, AutocompleteResponse, AddressDetails } from '#shared/types/maps'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    placeholder?: string
    disabled?: boolean
    minChars?: number
    debounceMs?: number
  }>(),
  { modelValue: '', placeholder: 'Digite seu endereço e número', disabled: false, minChars: 3, debounceMs: 350 },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', details: AddressDetails): void
  /** Emitido quando o texto muda após uma seleção (coordenadas antigas ficam inválidas). */
  (e: 'invalidate'): void
}>()

const query = ref(props.modelValue)
const suggestions = ref<AddressSuggestion[]>([])
const open = ref(false)
const loading = ref(false)
const errorMsg = ref('')
const activeIndex = ref(-1)

/** Rótulo da última seleção — para detectar edição manual posterior. */
let selectedLabel = ''
/** Token de sessão de billing (mesmo p/ autocomplete + place). */
let sessionToken = newToken()
/** Guarda contra respostas fora de ordem (race de digitação). */
let requestSeq = 0
let debounceTimer: ReturnType<typeof setTimeout> | null = null

function newToken(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

watch(
  () => props.modelValue,
  (v) => { if (v !== query.value) query.value = v ?? '' },
)

function onInput(): void {
  emit('update:modelValue', query.value)
  // Editou após selecionar → invalida coordenadas no pai.
  if (selectedLabel && query.value !== selectedLabel) {
    selectedLabel = ''
    emit('invalidate')
  }
  scheduleSearch()
}

function scheduleSearch(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  const term = query.value.trim()
  if (term.length < props.minChars) {
    suggestions.value = []
    open.value = false
    return
  }
  debounceTimer = setTimeout(runSearch, props.debounceMs)
}

async function runSearch(): Promise<void> {
  const term = query.value.trim()
  if (term.length < props.minChars) return
  const seq = ++requestSeq
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await $fetch<AutocompleteResponse>('/api/maps/autocomplete', {
      params: { search: term, sessionToken },
    })
    if (seq !== requestSeq) return // resposta obsoleta — ignora
    suggestions.value = res.suggestions.slice()
    activeIndex.value = -1
    open.value = res.suggestions.length > 0
  } catch (err) {
    if (seq !== requestSeq) return
    suggestions.value = []
    open.value = false
    errorMsg.value = friendly(err)
  } finally {
    if (seq === requestSeq) loading.value = false
  }
}

async function choose(s: AddressSuggestion): Promise<void> {
  open.value = false
  suggestions.value = []
  loading.value = true
  errorMsg.value = ''
  try {
    const details = await $fetch<AddressDetails>('/api/maps/place', {
      params: { placeId: s.placeId, sessionToken },
    })
    query.value = details.formattedAddress || s.description
    selectedLabel = query.value
    emit('update:modelValue', query.value)
    emit('select', details)
    sessionToken = newToken() // fecha a sessão de billing; próxima busca começa outra
  } catch (err) {
    errorMsg.value = friendly(err)
  } finally {
    loading.value = false
  }
}

function onKeydown(e: KeyboardEvent): void {
  if (!open.value || suggestions.value.length === 0) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % suggestions.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + suggestions.value.length) % suggestions.value.length
  } else if (e.key === 'Enter' && activeIndex.value >= 0) {
    e.preventDefault()
    const chosen = suggestions.value[activeIndex.value]
    if (chosen) void choose(chosen)
  } else if (e.key === 'Escape') {
    open.value = false
  }
}

function friendly(err: unknown): string {
  return (err as { data?: { message?: string } })?.data?.message
    ?? 'Não foi possível buscar o endereço agora. Tente novamente.'
}

onBeforeUnmount(() => { if (debounceTimer) clearTimeout(debounceTimer) })
</script>

<template>
  <div class="relative">
    <input
      v-model="query"
      type="text"
      :placeholder="placeholder"
      :disabled="disabled"
      autocomplete="off"
      role="combobox"
      aria-autocomplete="list"
      :aria-expanded="open"
      class="w-full px-3 py-2 border border-border rounded-md bg-surface text-text-primary placeholder:text-text-muted focus:ring-2 focus:ring-primary-500 focus:outline-none disabled:opacity-50"
      @input="onInput"
      @keydown="onKeydown"
      @focus="open = suggestions.length > 0"
      @blur="open = false"
    >

    <span
      v-if="loading"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted"
    >…</span>

    <ul
      v-if="open && suggestions.length"
      class="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-md border border-border bg-surface shadow-lg"
      role="listbox"
    >
      <li
        v-for="(s, i) in suggestions"
        :key="s.placeId"
        role="option"
        :aria-selected="i === activeIndex"
        :class="[
          'cursor-pointer px-3 py-2 text-sm',
          i === activeIndex ? 'bg-surface-raised' : 'hover:bg-surface-raised',
        ]"
        @pointerdown.prevent="choose(s)"
        @mouseenter="activeIndex = i"
      >
        <span class="block text-text-primary truncate">{{ s.mainText }}</span>
        <span v-if="s.secondaryText" class="block text-xs text-text-muted truncate">{{ s.secondaryText }}</span>
      </li>
    </ul>

    <p v-if="errorMsg" class="text-[11px] text-danger-500 mt-1">{{ errorMsg }}</p>
  </div>
</template>
