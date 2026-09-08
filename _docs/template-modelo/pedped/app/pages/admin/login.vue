<!--
  @descricao: Tela de login do painel administrativo
  @objetivo: Login claro e sóbrio (sem animações/efeitos), tipografia do
    design system, tokens semânticos (compatíveis com dark mode), uso de
    `useStore()` for the displayed brand and `useNotification()` for feedback
    de erro. A lógica de auth (`signInWithPassword` + observação reativa
    de `useSupabaseUser`) é preservada — Nuxt Supabase atualiza o usuário
    de forma assíncrona após o login.
-->

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { LogIn, Lock, Mail, ShieldCheck } from '@lucide/vue'
import { navigateTo, useRoute } from 'nuxt/app'
import { useStore } from '~/composables/useStore'
import { useNotification } from '~/composables/useNotification'

definePageMeta({
  layout: false,
})

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()
const { loja, fetch: fetchLoja } = useStore()
const { notify } = useNotification()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

// Destino pós-login: volta para onde o usuário tentou ir (ou landing padrão).
function getRedirectTarget(): string {
  const raw = route.query.redirect
  const target = typeof raw === 'string' ? raw : ''
  // Valida que o redirect é interno (evita open-redirect).
  return target.startsWith('/admin') ? target : '/admin/orders'
}

// Garante que a marca esteja disponível mesmo que o login seja a primeira
// route accessed (`app.vue#onMounted` runs in parallel). `useStore` is
// idempotente — não dispara request adicional se já estiver em cache.
onMounted(async () => {
  await fetchLoja()
})

const handleLogin = async (): Promise<void> => {
  if (!email.value || !password.value) {
    errorMsg.value = 'Preencha e-mail e senha para continuar.'
    return
  }

  loading.value = true
  errorMsg.value = ''

  const { error } = await supabase.auth.signInWithPassword({
    email: email.value,
    password: password.value,
  })

  if (error) {
    // Mensagem inline (`aria-live`) + toast — compatível com leitores de tela
    // e visual. Não revelamos detalhes do erro do Supabase para evitar
    // enumeração de contas.
    errorMsg.value = 'Acesso negado. Verifique e-mail e senha.'
    notify.error('Acesso negado', 'Verifique seu e-mail e senha e tente novamente.')
    loading.value = false
    return
  }

  // O `useSupabaseUser()` é populado de forma assíncrona após o login
  // bem-sucedido. Aguardamos a primeira atualização para garantir que o
  // middleware de rotas autenticadas reconheça a sessão.
  const destination = getRedirectTarget()

  if (user.value) {
    await navigateTo(destination)
    return
  }

  const unwatch = watch(user, async (newVal) => {
    if (newVal) {
      unwatch()
      await navigateTo(destination)
    }
  })
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface px-4 py-12">
    <div class="w-full max-w-md">
      <!-- Marca: logomarca quando disponível, fallback para nome_fantasia ou label institucional -->
      <div class="flex flex-col items-center gap-3 mb-8">
        <NuxtImg
          v-if="loja?.logomarca"
          :src="loja.logomarca"
          :alt="loja.nome_fantasia"
          loading="eager"
          class="h-20 max-w-[280px] object-contain"
        />
        <div
          v-else
          class="w-16 h-16 rounded-xl bg-surface-raised border border-border flex items-center justify-center"
          aria-hidden="true"
        >
          <ShieldCheck class="w-8 h-8 text-text-secondary" :stroke-width="1.75" />
        </div>

        <div class="text-center">
          <h1 class="text-xl font-semibold text-text-primary">
            {{ loja?.nome_fantasia ?? 'Painel Administrativo' }}
          </h1>
          <p class="mt-1 text-sm text-text-secondary">
            Entre com suas credenciais para continuar.
          </p>
        </div>
      </div>

      <!-- Card do formulário -->
      <div class="bg-surface-raised border border-border rounded-xl shadow-card p-6 sm:p-8">
        <form class="space-y-5" novalidate @submit.prevent="handleLogin">
          <!-- E-mail -->
          <div>
            <UiLabel for="login-email" required>E-mail</UiLabel>
            <div class="mt-2 relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Mail class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              </span>
              <input
                id="login-email"
                v-model="email"
                type="email"
                autocomplete="email"
                required
                :disabled="loading"
                placeholder="voce@empresa.com"
                class="block w-full pl-10 pr-3 py-2.5 rounded-md border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
            </div>
          </div>

          <!-- Senha -->
          <div>
            <UiLabel for="login-password" required>Senha</UiLabel>
            <div class="mt-2 relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              </span>
              <input
                id="login-password"
                v-model="password"
                type="password"
                autocomplete="current-password"
                required
                :disabled="loading"
                placeholder="Sua senha"
                class="block w-full pl-10 pr-3 py-2.5 rounded-md border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
            </div>
          </div>

          <!-- Mensagem de erro inline com aria-live polite -->
          <p
            id="login-error"
            aria-live="polite"
            role="alert"
            class="text-sm text-alert min-h-[1.25rem]"
          >
            {{ errorMsg }}
          </p>

          <!-- Submit -->
          <button
            type="submit"
            :disabled="loading"
            :aria-busy="loading"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-interactive-primary text-text-inverse font-medium hover:bg-interactive-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <span v-if="loading" aria-live="polite" class="inline-flex items-center gap-2">
              <svg
                class="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Autenticando...
            </span>
            <span v-else class="inline-flex items-center gap-2">
              <LogIn class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              Entrar
            </span>
          </button>

          <div class="text-center">
            <NuxtLink
              to="/auth/forgot-password"
              class="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Esqueci minha senha
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>

    <UiNotificationStack />
  </div>
</template>
