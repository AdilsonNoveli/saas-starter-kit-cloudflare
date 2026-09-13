<script setup lang="ts">
import { useStore } from '~/composables/useStore'

const { loja } = useStore()
const currentYear = new Date().getFullYear()
</script>

<template>
  <footer class="w-full py-6 mt-auto border-t border-border bg-surface-raised/30 text-text-muted text-center text-xs shrink-0 px-4">
    <div class="max-w-7xl mx-auto flex flex-col items-center justify-center gap-3">
      <!-- Menu de Páginas -->
      <div class="flex items-center justify-center gap-2 sm:gap-3 text-text-secondary">
        <NuxtLink id="footer-link-terms" to="/terms" class="hover:underline hover:text-text-primary transition-colors">
          Termos de Uso
        </NuxtLink>
        <span class="text-border">|</span>
        <NuxtLink id="footer-link-privacy" to="/privacy" class="hover:underline hover:text-text-primary transition-colors">
          Política de Privacidade
        </NuxtLink>
      </div>

      <!-- Copyright e CNPJ -->
      <div class="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 opacity-80">
        <span>
          &copy; {{ currentYear }} <strong class="text-text-secondary">{{ loja?.nome_fantasia || 'Catálogo' }}</strong>
        </span>
        <span v-if="loja?.cnpj" class="hidden sm:inline text-border">|</span>
        <span v-if="loja?.cnpj" class="font-mono text-[11px]">
          CNPJ: {{ loja.cnpj }}
        </span>
      </div>
    </div>
  </footer>
</template>
