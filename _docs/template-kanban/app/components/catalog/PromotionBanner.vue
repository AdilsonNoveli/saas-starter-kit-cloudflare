<script setup lang="ts">
import { computed } from 'vue'
import type { CatalogPromocao } from '#shared/types/promotion'

const props = defineProps<{
  promocao: CatalogPromocao
}>()

const hasText = computed(() => !!(props.promocao.nome || props.promocao.descricao))
</script>

<template>
  <div class="w-full mb-4 px-3 md:px-5 max-w-7xl mx-auto last:mb-0">
    <div
      class="relative w-full overflow-hidden rounded-xl shadow-md bg-surface-raised aspect-[16/7] md:aspect-[1600/360] cursor-pointer hover:opacity-98 active:scale-[0.995] transition-all duration-200"
    >
      <!-- Imagem de fundo -->
      <NuxtImg
        v-if="promocao.foto_url"
        :src="promocao.foto_url"
        :alt="promocao.nome"
        class="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        sizes="100vw"
      />

      <!-- Fallback: gradiente com texto (sem imagem) -->
      <div
        v-else
        class="absolute inset-0 bg-gradient-to-br from-gray-950 via-gray-900 to-brand/30 flex flex-col items-start justify-center px-6 sm:px-10 md:px-14 py-6"
      >
        <span class="text-[9px] sm:text-xs font-bold tracking-widest uppercase text-brand mb-1.5 bg-brand/10 border border-brand/20 px-2 py-0.5 rounded-full select-none">
          Oferta Especial
        </span>
        <h3 class="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight uppercase tracking-tight">
          {{ promocao.nome }}
        </h3>
        <p v-if="promocao.descricao" class="mt-2 text-xs sm:text-sm md:text-base text-gray-300 max-w-md md:max-w-xl line-clamp-2 font-medium leading-relaxed">
          {{ promocao.descricao }}
        </p>
      </div>

      <!-- Overlay de texto sobre imagem -->
      <div
        v-if="promocao.foto_url && hasText"
        class="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-black/90 via-black/45 to-transparent flex flex-col items-start justify-center px-6 sm:px-10 md:px-14 py-6"
      >
        <h3 class="text-lg sm:text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-md tracking-tight uppercase">
          {{ promocao.nome }}
        </h3>
        <p v-if="promocao.descricao" class="mt-2 text-xs sm:text-sm md:text-base text-white/90 max-w-md md:max-w-xl line-clamp-2 drop-shadow-sm font-medium leading-relaxed">
          {{ promocao.descricao }}
        </p>
      </div>
    </div>
  </div>
</template>
