<script setup lang="ts">
/**
 * UiNumberInput — input numérico com setas Lucide (ChevronUp/ChevronDown).
 * Substitui o spinner nativo do browser por controles visuais consistentes
 * com o design system (mesmo padrão do campo "Ajuste +/-" do card Estoque).
 *
 * Uso:
 *   <UiNumberInput v-model.number="form.valor" :step="0.1" placeholder="0" />
 */
import { ChevronUp, ChevronDown } from '@lucide/vue'

interface Props {
  modelValue: number | null
  step?: number
  min?: number | string
  max?: number | string
  placeholder?: string
  disabled?: boolean
  id?: string
  /** Casas decimais usadas no arredondamento dos botões +/-. Default: 3. */
  precision?: number
  /**
   * Quando true, remove o border-radius do lado direito do input.
   * Use para grudar um botão imediatamente à direita (input-group).
   */
  attachRight?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  step: 1,
  min: undefined,
  max: undefined,
  placeholder: '0',
  disabled: false,
  id: undefined,
  precision: 3,
  attachRight: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  blur: []
  'keyup:enter': []
}>()

function handleInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  emit('update:modelValue', raw === '' ? null : Number(raw))
}

function increment() {
  if (props.disabled) return
  const current = props.modelValue ?? 0
  const step = Number(props.step)
  const next = Number((current + step).toFixed(props.precision))
  if (props.max !== undefined && next > Number(props.max)) return
  emit('update:modelValue', next)
}

function decrement() {
  if (props.disabled) return
  const current = props.modelValue ?? 0
  const step = Number(props.step)
  const next = Number((current - step).toFixed(props.precision))
  if (props.min !== undefined && next < Number(props.min)) return
  emit('update:modelValue', next)
}
</script>

<template>
  <div class="relative flex items-center">
    <input
      :id="id"
      type="number"
      :value="modelValue ?? ''"
      :step="step"
      :min="min"
      :max="max"
      :placeholder="placeholder"
      :disabled="disabled"
      class="w-full pl-3 pr-7 py-2 border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      :class="attachRight ? 'rounded-l' : 'rounded'"
      @input="handleInput"
      @blur="emit('blur')"
      @keyup.enter="emit('keyup:enter')"
    >
    <div class="absolute right-1 flex flex-col" aria-hidden="true">
      <button
        type="button"
        class="p-0.5 leading-none text-text-muted hover:text-brand-green transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        tabindex="-1"
        aria-label="Aumentar"
        :disabled="disabled"
        @click="increment"
      >
        <ChevronUp class="w-3.5 h-3.5" />
      </button>
      <button
        type="button"
        class="p-0.5 leading-none text-text-muted hover:text-brand-green transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        tabindex="-1"
        aria-label="Diminuir"
        :disabled="disabled"
        @click="decrement"
      >
        <ChevronDown class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>
</template>
