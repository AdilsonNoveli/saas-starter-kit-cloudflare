<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

import { useRouter, useRoute } from 'vue-router'
import {
  Bolt,
  DollarSign,
  Users,
  Package2,
  Flame,
  Settings2,
  LogOut,
  Unplug,
  ChevronRight,
  ChevronLeft,
} from '@lucide/vue'
import { useTheme } from '~/composables/useTheme'
import { useCurrentUser } from '~/composables/useCurrentUser'
const supabase = useSupabaseClient()
const router = useRouter()
const route = useRoute()

// Ativa o tema (claro/escuro/sistema) — aplica a classe `.dark` no <html>
// reativamente em toda a área administrativa.
useTheme()

// Perfil/papel do usuário corrente — usado para gating de navegação (6.1).
const authUser = useSupabaseUser()
const { user: currentUser, fetch: fetchCurrentUser } = useCurrentUser()
onMounted(() => {
  void fetchCurrentUser()
})

const settingsModalOpen = ref(false)
const isSettingsActive = computed<boolean>(() =>
  settingsModalOpen.value ||
  route.path.startsWith('/admin/settings') ||
  route.path.startsWith('/admin/integrations')
)
const userInitials = computed<string>(() => {
  const name = currentUser.value?.nome || authUser.value?.email || ''
  return name.split(' ').slice(0, 2).map(n => n?.[0] ?? '').join('').toUpperCase() || '?'
})

// Estados da Sidebar:
// No Desktop: isExpanded controla expandido (true) vs colapsado (false)
// No Mobile: mobileState controla escondido ('hidden') vs apenas ícone ('icon') vs completo ('full')
const isExpanded = ref(false)
const mobileState = useState<'hidden' | 'icon' | 'full'>('admin:mobileSidebarState', () => 'hidden')

const handleMenuToggle = () => {
  if (import.meta.client && window.innerWidth < 768) {
    mobileState.value = mobileState.value === 'full' ? 'icon' : 'full'
  } else {
    isExpanded.value = !isExpanded.value
  }
}

// Gesto de Swipe Left para fechar o menu no Mobile
const touchStartX = ref(0)
const touchStartY = ref(0)

const onTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0]
  if (touch) {
    touchStartX.value = touch.clientX
    touchStartY.value = touch.clientY
  }
}

const onTouchEnd = (e: TouchEvent) => {
  const touch = e.changedTouches[0]
  if (touch) {
    const deltaX = touch.clientX - touchStartX.value
    const deltaY = touch.clientY - touchStartY.value
    // Se arrastou para a esquerda em pelo menos 50px com pouca variação vertical
    if (deltaX < -50 && Math.abs(deltaY) < 40) {
      mobileState.value = 'hidden'
    }
  }
}

// Handlers nomeados para permitir `removeEventListener`: como listeners de
// `document` sobrevivem ao unmount do layout, sem cleanup eles se acumulam a
// cada remontagem e mantêm vivos os refs da instância antiga.
const handleGlobalClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('#admin-settings-panel')) {
    settingsModalOpen.value = false
  }
  // Fechar menu mobile ao clicar fora do menu
  if (
    window.innerWidth < 768 &&
    mobileState.value !== 'hidden' &&
    !target.closest('aside') &&
    !target.closest('.fixed') &&
    !target.closest('button')
  ) {
    mobileState.value = 'hidden'
  }
}

const handleGlobalKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    settingsModalOpen.value = false
    if (window.innerWidth < 768) {
      mobileState.value = 'hidden'
    }
  }
}

onMounted(() => {
  document.addEventListener('click', handleGlobalClick)
  document.addEventListener('keydown', handleGlobalKeydown)
})

onUnmounted(() => {
  document.removeEventListener('click', handleGlobalClick)
  document.removeEventListener('keydown', handleGlobalKeydown)
})

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/admin/login')
}

const navItems = [
  { path: '/admin/dashboard', icon: Bolt, label: 'Dashboard', activePaths: ['/admin/dashboard'] },
  { path: '/admin/orders', icon: DollarSign, label: 'Vendas', activePaths: ['/admin/orders', '/admin/preorders'] },
  { path: '/admin/customers', icon: Users, label: 'Clientes', activePaths: ['/admin/customers'] },
  { path: '/admin/products', icon: Package2, label: 'Catálogo', activePaths: ['/admin/products', '/admin/categories', '/admin/kits', '/admin/inventory'] },
  { path: '/admin/promotions', icon: Flame, label: 'Promoções', activePaths: ['/admin/promotions'] },
]
</script>

<template>
  <div class="bg-surface font-sans text-text-primary h-screen w-screen flex overflow-hidden relative admin-layout">
    
    <!-- Botão flutuante (com seta) para abrir no mobile quando estiver completamente escondido -->
    <button
      v-if="mobileState === 'hidden'"
      type="button"
      class="fixed left-4 top-3.5 z-50 bg-surface-raised border border-border rounded-lg w-9 h-9 shadow-sm hidden max-md:flex max-md:items-center max-md:justify-center text-text-muted hover:text-text-primary transition-all active:scale-95"
      @click="mobileState = 'icon'"
    >
      <ChevronRight class="w-4 h-4" />
    </button>

    <!-- BEGIN: Sidebar -->
    <aside
      class="h-full flex flex-col shrink-0 z-40 bg-surface-raised transition-all duration-300 ease-in-out relative border-border"
      :class="[
        // Classes para Mobile (abaixo de md)
        mobileState === 'hidden' ? 'max-md:w-0 max-md:overflow-hidden max-md:py-0 max-md:border-r-0' : '',
        mobileState === 'icon' ? 'max-md:w-[72px] max-md:items-center max-md:border-r' : '',
        mobileState === 'full' ? 'max-md:w-64 max-md:items-start max-md:px-4 max-md:border-r' : '',

        // Classes para Desktop (md e acima)
        isExpanded 
          ? 'md:w-64 md:items-start md:px-4 md:py-4 md:border-r' 
          : 'md:w-[72px] md:items-center md:py-4 md:border-r md:overflow-visible'
      ]"
      @touchstart="onTouchStart"
      @touchend="onTouchEnd"
    >
      <!-- Botão para fechar/esconder completamente no mobile (aba de puxar/recolher) -->
      <button
        v-if="mobileState !== 'hidden'"
        type="button"
        class="absolute -right-3.5 top-1/2 -translate-y-1/2 z-20 bg-surface-raised border border-border rounded-full p-1 shadow-md flex items-center justify-center text-text-muted hover:text-text-primary transition-all active:scale-95 md:hidden"
        @click="mobileState = 'hidden'"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <!-- Menu Toggle Icon -->
      <div 
        class="mb-8 cursor-pointer flex items-center text-text-muted w-full select-none"
        :class="[
          isExpanded ? 'md:justify-start md:px-2' : 'md:justify-center',
          mobileState === 'full' ? 'max-md:justify-start max-md:px-2' : 'max-md:justify-center'
        ]"
        @click="handleMenuToggle"
      >
        <template v-if="isExpanded || mobileState === 'full'">
          <ChevronLeft class="w-7 h-7" />
        </template>
        <template v-else>
          <!-- Quando fechado: mostra ChevronRight indicando expansão em qualquer tela -->
          <ChevronRight class="w-7 h-7" />
        </template>
        <span v-if="isExpanded" class="ml-4 font-bold text-text-primary text-lg tracking-tight hidden md:inline">Menu</span>
        <span v-if="mobileState === 'full'" class="ml-4 font-bold text-text-primary text-lg tracking-tight md:hidden">Menu</span>
      </div>

      <!-- Top Nav Items -->
      <nav 
        class="flex-1 flex flex-col gap-4 w-full" 
        :class="[
          isExpanded ? 'md:items-stretch' : 'md:items-center',
          mobileState === 'full' ? 'max-md:items-stretch' : 'max-md:items-center'
        ]"
      >
        <NuxtLink
          v-for="item in navItems" 
          :key="item.path" 
          :to="item.path"
          class="flex items-center rounded-lg transition-colors group border"
          :class="[
            item.activePaths.some(p => route.path.startsWith(p))
              ? 'bg-admin-primary/10 text-admin-primary border-admin-primary/20 dark:bg-admin-primary/20 dark:text-admin-accent dark:border-admin-accent/30 shadow-sm'
              : 'text-text-muted hover:text-text-primary hover:bg-surface-raised border-transparent',
            
            // Mobile-only styles
            mobileState === 'full' ? 'max-md:px-4 max-md:py-3 max-md:w-full max-md:justify-start' : 'max-md:w-12 max-md:h-12 max-md:justify-center',
            
            // Desktop-only styles
            isExpanded ? 'md:px-4 md:py-3 md:w-full md:justify-start' : 'md:w-12 md:h-12 md:justify-center'
          ]"
          :title="isExpanded || mobileState === 'full' ? '' : item.label"
          @click="mobileState = 'hidden'"
        >
          <component :is="item.icon" class="w-6 h-6 shrink-0" />
          <span v-if="isExpanded" class="ml-4 font-medium hidden md:inline">{{ item.label }}</span>
          <span v-if="mobileState === 'full'" class="ml-4 font-medium md:hidden">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <!-- Bottom Nav Items -->
      <div 
        class="mt-auto flex flex-col gap-2 w-full" 
        :class="[
          isExpanded ? 'md:items-stretch' : 'md:items-center',
          mobileState === 'full' ? 'max-md:items-stretch' : 'max-md:items-center'
        ]"
      >
        <!-- Configurações → dropdown ancorado -->
        <div id="admin-settings-panel" class="relative w-full flex justify-center">
          <button
            class="flex items-center rounded-lg transition-colors group border"
            :class="[
              isSettingsActive
                ? 'bg-admin-primary/10 text-admin-primary border-admin-primary/20 dark:bg-admin-primary/20 dark:text-admin-accent dark:border-admin-accent/30 shadow-sm'
                : 'text-text-muted hover:text-text-primary hover:bg-surface-raised border-transparent',
              
              // Mobile-only styles
              mobileState === 'full' ? 'max-md:px-4 max-md:py-3 max-md:w-full max-md:justify-start' : 'max-md:w-12 max-md:h-12 max-md:justify-center',
              
              // Desktop-only styles
              isExpanded ? 'md:px-4 md:py-3 md:w-full md:justify-start' : 'md:w-12 md:h-12 md:justify-center'
            ]"
            :title="isExpanded || mobileState === 'full' ? '' : 'Configurações'"
            @click="settingsModalOpen = !settingsModalOpen"
          >
            <Settings2 class="w-6 h-6 shrink-0" />
            <span v-if="isExpanded" class="ml-4 font-medium hidden md:inline">Configurações</span>
            <span v-if="mobileState === 'full'" class="ml-4 font-medium md:hidden">Configurações</span>
          </button>

          <transition
            enter-active-class="transition ease-out duration-100"
            enter-from-class="transform opacity-0 scale-95"
            enter-to-class="transform opacity-100 scale-100"
            leave-active-class="transition ease-in duration-75"
            leave-from-class="transform opacity-100 scale-100"
            leave-to-class="transform opacity-0 scale-95"
          >
            <div
              v-if="settingsModalOpen"
              class="absolute bg-surface border border-border rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in"
              :class="[
                // Mobile-only styles
                mobileState === 'full' ? 'max-md:bottom-full max-md:left-0 max-md:mb-2 max-md:w-full' : 'max-md:bottom-0 max-md:left-full max-md:ml-2 max-md:w-72',
                
                // Desktop-only styles
                isExpanded ? 'md:bottom-full md:left-0 md:mb-2 md:w-full' : 'md:bottom-0 md:left-full md:ml-2 md:w-72'
              ]"
            >
              <!-- Header: avatar + nome + email — clique navega para o perfil -->
              <button
                type="button"
                class="px-4 py-3 border-b border-border flex items-center gap-3 w-full text-left hover:bg-surface-raised transition-colors"
                @click="router.push('/admin/profile'); settingsModalOpen = false; mobileState = 'hidden'"
              >
                <div class="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center shrink-0 text-text-primary">
                  <span class="text-xs font-bold">{{ userInitials }}</span>
                </div>
                <div class="flex-1 min-w-0">
                  <p class="font-semibold text-text-primary text-sm truncate">{{ currentUser?.nome || 'Usuário' }}</p>
                  <p class="text-xs text-text-muted truncate">{{ authUser?.email }}</p>
                </div>
              </button>

              <!-- Links -->
              <div class="py-1">
                <NuxtLink
                  to="/admin/settings"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
                  @click="settingsModalOpen = false; mobileState = 'hidden'"
                >
                  <Settings2 class="w-4 h-4 text-text-muted shrink-0" />
                  <span>Configurações</span>
                </NuxtLink>
                <NuxtLink
                  to="/admin/integrations"
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-surface-raised transition-colors"
                  @click="settingsModalOpen = false; mobileState = 'hidden'"
                >
                  <Unplug class="w-4 h-4 text-text-muted shrink-0" />
                  <span>Integrações</span>
                </NuxtLink>
              </div>

              <!-- Logout -->
              <div class="border-t border-border py-1">
                <button
                  class="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  @click="handleLogout"
                >
                  <LogOut class="w-4 h-4 text-red-500 shrink-0" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          </transition>
        </div>


        <!-- Logo PEDPED -->
        <a 
          href="https://pedped.com.br" 
          target="_blank" 
          rel="noopener noreferrer"
          class="flex items-center justify-center transition-all hover:opacity-80 pt-2 border-t border-border" 
          :class="[
            // Mobile-only styles
            mobileState === 'full' ? 'max-md:px-4 max-md:py-3 max-md:w-full' : 'max-md:w-12 max-md:h-12',
            
            // Desktop-only styles
            isExpanded ? 'md:px-4 md:py-3 md:w-full' : 'md:w-12 md:h-12'
          ]"
          title="Visitar pedped.com.br"
        >
          <img 
            src="/icons/pedped-logo.svg" 
            alt="PEDPED" 
            class="shrink-0"
            :class="[
              // Mobile-only styles
              mobileState === 'full' ? 'max-md:w-12 max-md:h-12' : 'max-md:w-10 max-md:h-10',
              
              // Desktop-only styles
              isExpanded ? 'md:w-12 md:h-12' : 'md:w-10 md:h-10'
            ]"
          >
        </a>

      </div>
    </aside>
    <!-- END: Sidebar -->

    <!-- BEGIN: Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 h-full overflow-y-auto bg-surface transition-all duration-300 relative">
      <!-- Page Content -->
      <div class="flex-1">
        <slot />
      </div>

      <!-- Footer de Marca do Sistema -->
      <footer class="w-full py-6 mt-12 border-t border-border bg-surface-raised flex items-center justify-center text-xs text-text-muted select-none">
        <p>&copy; {{ new Date().getFullYear() }} PEDPED</p>
      </footer>
    </main>
    <!-- END: Main Content Area -->

    <!-- Sistema global de notificações (toasts + diálogo de confirmação) — montado uma única vez -->
    <UiNotificationStack />
    <UiConfirmDialog />

  </div>
</template>

<style>
/* Utilities globais para o Admin */
.kanban-board-wrapper {
  scrollbar-width: thin;
  scrollbar-color: #cbd5e1 transparent;
}
.kanban-board-wrapper::-webkit-scrollbar {
  height: 8px;
}
.kanban-board-wrapper::-webkit-scrollbar-track {
  background: transparent;
}
.kanban-board-wrapper::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

/* 
   Enterprise Grade Border Radius Overrides for Admin Layout:
   Reduz os arredondamentos das bordas (rounded-*) para um visual
   mais profissional, robusto e clean (cantos mais retos, estilo Linke)
   APENAS no painel principal e componentes de conteúdo, exceto na sidebar (aside).
*/
.admin-layout {
  --radius-xs: 2px !important;
  --radius-sm: 3px !important;
  --radius-md: 4px !important;
  --radius-lg: 5px !important;
  --radius-xl: 6px !important;
  --radius-2xl: 6px !important;
  --radius-3xl: 8px !important;
  --radius-4xl: 8px !important;
}

/* Força cantos mais retilíneos em componentes comuns do admin, exceto no sidebar (aside) */
.admin-layout main input,
.admin-layout main select,
.admin-layout main textarea,
.admin-layout main button,
.admin-layout main a.rounded-lg,
.admin-layout main a.rounded-xl,
.admin-layout main a.rounded-md,
.admin-layout main .rounded-lg,
.admin-layout main .rounded-xl,
.admin-layout main .rounded-2xl,
.admin-layout main .rounded-md,
.admin-layout .modal-content input,
.admin-layout .modal-content button,
.admin-layout .modal-content select,
.admin-layout .modal-content textarea {
  border-radius: 4px !important;
}

/* Permitir que avatares, status dots e ícones redondos do main mantenham borda circular */
.admin-layout main .rounded-full,
.admin-layout main [class*="rounded-full"] {
  border-radius: 9999px !important;
}

/* Evita deformações em badges ou botões circulares no main */
.admin-layout main .w-2.h-2.rounded-full,
.admin-layout main .w-3.h-3.rounded-full,
.admin-layout main .w-9.h-9.rounded-full,
.admin-layout main .w-8.h-8.rounded-full {
  border-radius: 9999px !important;
}
</style>
