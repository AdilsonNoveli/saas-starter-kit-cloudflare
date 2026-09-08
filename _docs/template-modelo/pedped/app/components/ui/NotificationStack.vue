<!--
  @descricao: Renderizador da fila de toasts (singleton) consumindo `useNotification`
  @objetivo: Exibir N toasts empilhados com transição suave. Deve ser montado
    UMA ÚNICA VEZ no layout raiz (admin/catalog) — o estado é compartilhado.
-->

<script setup lang="ts">
import { useNotification } from '~/composables/useNotification'

const { queue, dismiss } = useNotification()
</script>

<template>
  <div
    aria-live="assertive"
    aria-atomic="true"
    class="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 pb-24 z-60"
  >
    <TransitionGroup
      enter-active-class="transition ease-out duration-250"
      enter-from-class="translate-y-3 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition ease-in duration-150 absolute"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-for="item in queue"
        :key="item.id"
        class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-2xl ring-1 ring-black/8"
      >
        <div class="flex items-center gap-3 px-4 py-3.5">
          <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-text-primary leading-snug">
              {{ item.title }}<span v-if="item.message" class="font-normal text-text-secondary"> {{ item.message }}</span>
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 -mr-1 p-1 rounded-lg text-text-muted hover:text-text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Fechar"
            @click="dismiss(item.id)"
          >
            <svg class="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>
