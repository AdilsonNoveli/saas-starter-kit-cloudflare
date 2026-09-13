<script setup lang="ts">
import { useAsyncData } from '#app'

definePageMeta({
  layout: 'catalog'
})

const { data: page, error } = await useAsyncData('page:privacidade', () => 
  $fetch('/api/store/pages/privacidade')
)

useHead({
  title: computed(() => page.value?.titulo || 'Política de Privacidade'),
  meta: [
    {
      name: 'description',
      content: 'Saiba como coletamos, usamos e protegemos seus dados pessoais e de privacidade em nosso catálogo.'
    }
  ]
})
</script>

<template>
  <div class="w-full max-w-3xl mx-auto px-4 py-8 md:py-12">
    <div v-if="error" class="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-center">
      <p class="font-semibold">Erro ao carregar a Política de Privacidade.</p>
      <p class="text-xs mt-1">Por favor, tente novamente mais tarde.</p>
    </div>

    <div v-else-if="!page" class="flex flex-col items-center justify-center py-12">
      <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin mb-3" />
      <span class="text-text-muted text-sm">Carregando política...</span>
    </div>

    <article v-else class="space-y-6">
      <header class="border-b border-border pb-6">
        <h1 id="page-privacy-title" class="text-2xl md:text-3xl font-bold tracking-tight text-text-primary font-sans">
          {{ page.titulo }}
        </h1>
        <p v-if="page.atualizado_em" class="text-xs text-text-muted mt-2">
          Última atualização: {{ new Date(page.atualizado_em).toLocaleDateString('pt-BR') }}
        </p>
      </header>

      <section class="prose prose-sm md:prose-base dark:prose-invert max-w-none text-text-secondary leading-relaxed whitespace-pre-line font-sans">
        {{ page.conteudo }}
      </section>
    </article>
  </div>
</template>
