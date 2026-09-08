<!--
  @descricao: Indicador de força de senha enterprise-grade com acessibilidade WCAG 2.1 AA
  @objetivo: Fornecer feedback visual e textual sobre força da senha em tempo real
-->

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  password: string
}

const props = defineProps<Props>()

/**
 * @funcao: calculatePasswordStrength
 * @parametros: password (string) - Senha a ser avaliada
 * @retorno: number - Score de 0 a 4
 * @descricao: Calcula força da senha baseado em critérios enterprise
 * @objetivo: Fornecer avaliação objetiva e consistente
 */
const calculatePasswordStrength = (password: string): number => {
  if (!password) return 0

  let score = 0

  // Critério 1: Comprimento (peso maior)
  if (password.length >= 8) score++
  if (password.length >= 12) score++

  // Critério 2: Letras maiúsculas
  if (/[A-Z]/.test(password)) score++

  // Critério 3: Números
  if (/\d/.test(password)) score++

  // Critério 4: Caracteres especiais
  if (/[^A-Z0-9]/i.test(password)) score++

  // Normalizar para 0-4
  return Math.min(score, 4)
}

const strength = computed(() => calculatePasswordStrength(props.password))

const strengthConfig = computed(() => {
  const configs = {
    0: {
      label: 'Muito fraca',
      color: 'bg-alert',
      width: 'w-0',
      ariaLabel: 'Força da senha: muito fraca',
    },
    1: {
      label: 'Fraca',
      color: 'bg-alert',
      width: 'w-1/4',
      ariaLabel: 'Força da senha: fraca',
    },
    2: {
      label: 'Razoável',
      color: 'bg-warning',
      width: 'w-2/4',
      ariaLabel: 'Força da senha: razoável',
    },
    3: {
      label: 'Boa',
      color: 'bg-warning',
      width: 'w-3/4',
      ariaLabel: 'Força da senha: boa',
    },
    4: {
      label: 'Forte',
      color: 'bg-success',
      width: 'w-full',
      ariaLabel: 'Força da senha: forte',
    },
  }

  return configs[strength.value as keyof typeof configs]
})

const requirementsSummary = computed(() => {
  const met = [
    props.password.length >= 8,
    /[A-Z]/.test(props.password),
    /\d/.test(props.password),
    /[^A-Z0-9]/i.test(props.password),
  ].filter(Boolean).length

  return `${met}/4 requisitos atendidos`
})
</script>

<template>
  <div v-if="password" class="mt-2 space-y-2">
    <!-- Progress Bar -->
    <div class="relative h-2 w-full overflow-hidden rounded-full bg-border">
      <div
        :class="[strengthConfig.color, strengthConfig.width]"
        class="h-full transition-all duration-300 ease-out"
        role="progressbar"
        :aria-valuenow="strength"
        aria-valuemin="0"
        aria-valuemax="4"
        :aria-label="strengthConfig.ariaLabel"
      />
    </div>

    <!-- Strength Label and Summary -->
    <div class="flex items-center justify-between text-sm">
      <span
        class="font-medium text-text-secondary"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        Força: {{ strengthConfig.label }}
      </span>
      <span class="text-text-muted">
        {{ requirementsSummary }}
      </span>
    </div>
  </div>
</template>
