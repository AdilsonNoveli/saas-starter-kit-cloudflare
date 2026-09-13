<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { LayoutGrid, CalendarDays, History, EllipsisVertical, Check } from '@lucide/vue'

const route = useRoute()
const isOpen = ref(false)

const NAV_ITEMS = [
  { name: 'KANBAN VENDAS', path: '/admin/orders', icon: LayoutGrid },
  { name: 'ENCOMENDAS', path: '/admin/preorders', icon: CalendarDays },
  { name: 'HISTÓRICO', path: '/admin/orders/history', icon: History },
] as const

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const closeDropdown = () => {
  isOpen.value = false
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="relative shrink-0 select-none">
    <!-- Navegação Desktop: Abas horizontais -->
    <nav class="hidden md:flex items-center gap-1.5 sm:gap-2">
      <NuxtLink
        v-for="item in NAV_ITEMS"
        :key="item.path"
        :to="item.path"
        class="px-2.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap"
        :class="
          route.path === item.path
            ? 'bg-brand-light text-black shadow-xs dark:bg-brand-green/20 dark:text-brand-green font-extrabold'
            : 'text-text-muted hover:text-text-primary hover:bg-surface-raised'
        "
      >
        {{ item.name }}
      </NuxtLink>
    </nav>

    <!-- Navegação Mobile: Botão ícone com Dropdown -->
    <div class="md:hidden relative">
      <button
        type="button"
        class="w-9 h-9 flex items-center justify-center rounded-lg border border-border transition-all active:scale-95 cursor-pointer"
        :class="
          isOpen
            ? 'bg-brand-light dark:bg-brand-green/25 text-text-primary shadow-xs border-brand-green/40'
            : 'bg-surface text-text-muted hover:text-text-primary'
        "
        aria-label="Menu de Navegação de Pedidos"
        title="Navegação de Pedidos"
        @click="toggleDropdown"
      >
        <EllipsisVertical class="w-4.5 h-4.5" />
      </button>

      <!-- Overlay de fundo para fechar o dropdown ao clicar fora -->
      <div
        v-if="isOpen"
        class="fixed inset-0 z-40"
        @click="closeDropdown"
      />

      <!-- Conteúdo do Dropdown -->
      <transition
        enter-active-class="transition ease-out duration-100"
        enter-from-class="transform opacity-0 scale-95 -translate-y-1"
        enter-to-class="transform opacity-100 scale-100 translate-y-0"
        leave-active-class="transition ease-in duration-75"
        leave-from-class="transform opacity-100 scale-100 translate-y-0"
        leave-to-class="transform opacity-0 scale-95 -translate-y-1"
      >
        <div
          v-if="isOpen"
          class="absolute left-0 mt-2 w-48 bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 py-1"
        >
          <NuxtLink
            v-for="item in NAV_ITEMS"
            :key="item.path"
            :to="item.path"
            class="flex items-center justify-between px-3.5 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors"
            :class="
              route.path === item.path
                ? 'bg-brand-light/80 text-black dark:bg-brand-green/20 dark:text-brand-green font-extrabold'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-raised'
            "
            @click="closeDropdown"
          >
            <div class="flex items-center gap-2.5">
              <component :is="item.icon" class="w-4 h-4 shrink-0 text-text-muted" />
              <span>{{ item.name }}</span>
            </div>
            <Check v-if="route.path === item.path" class="w-3.5 h-3.5 shrink-0 text-brand-green" />
          </NuxtLink>
        </div>
      </transition>
    </div>
  </div>
</template>
