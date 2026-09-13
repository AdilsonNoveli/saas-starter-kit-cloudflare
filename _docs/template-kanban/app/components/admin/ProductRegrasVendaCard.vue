<!--
  @descricao: Card "Regras de Venda" do formulário de produto.
  @objetivo: Toggles de disponibilidade no catálogo e venda fracionada —
    extraído de `[id].vue` (Card 4).
-->

<script setup lang="ts">
import { Settings } from '@lucide/vue'

const disponivel = defineModel<boolean>('disponivel', { required: true })
const permiteFracionamento = defineModel<boolean>('permiteFracionamento', { required: true })
</script>

<template>
  <div class="border border-border bg-surface-raised p-5 space-y-4 rounded-md">
    <div class="flex items-center gap-2 border-b border-border pb-3">
      <Settings class="w-4.5 h-4.5 text-brand-green" />
      <h3 class="text-sm font-bold text-text-primary uppercase tracking-wider">Regras de Venda</h3>
    </div>

    <div class="space-y-4 divide-y divide-border/50">
      <!-- Toggle: Disponível -->
      <div class="flex items-start gap-3 pt-0 pb-3">
        <UiToggle v-model="disponivel" size="sm" class="mt-0.5 shrink-0" />
        <div>
          <label class="block text-xs font-bold text-text-primary mb-0.5 cursor-pointer select-none" @click="disponivel = !disponivel">
            Exibir no Catálogo
          </label>
          <p class="text-[10px] text-text-muted leading-normal">
            Fica visível no catálogo e disponível para novos pedidos.
          </p>
        </div>
      </div>

      <!-- Toggle: Fracionamento -->
      <div class="flex items-start gap-3 pt-3">
        <UiToggle v-model="permiteFracionamento" size="sm" class="mt-0.5 shrink-0" />
        <div>
          <label class="block text-xs font-bold text-text-primary mb-0.5 cursor-pointer select-none" @click="permiteFracionamento = !permiteFracionamento">
            Permitir Venda Fracionada
          </label>
          <p class="text-[10px] text-text-muted leading-normal">
            Permite fracionar a quantidade (ex: 0,5 kg ou 1,2 litro).
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
