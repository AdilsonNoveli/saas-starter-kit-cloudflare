<!--
  @descricao: Solicitação de recuperação de senha do painel administrativo.
  @objetivo: Disparar o e-mail de recuperação do Supabase Auth apontando para
    `/auth/confirm`, o mesmo ponto de entrada usado pelo convite — um único
    caminho de verificação para manter.

    A resposta é sempre a mesma, exista o e-mail ou não: revelar a diferença
    transformaria esta tela num oráculo de enumeração de contas.
-->

<script setup lang="ts">
import { ref } from 'vue'
import { KeyRound, Mail } from '@lucide/vue'
import { useStore } from '~/composables/useStore'
import { useNotification } from '~/composables/useNotification'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const { loja } = useStore()
const { notify } = useNotification()

const email = ref('')
const loading = ref(false)
const sent = ref(false)

const handleSubmit = async (): Promise<void> => {
  const address = email.value.trim()
  if (!address || loading.value) return

  loading.value = true
  try {
    // `redirectTo` precisa estar na allowlist de Redirect URLs do projeto
    // Supabase, senão o link cai no Site URL padrão.
    await supabase.auth.resetPasswordForEmail(address, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/admin/update-password`,
    })
    // Sucesso incondicional por design (anti-enumeração): não checamos o erro
    // para não vazar se o e-mail existe.
    sent.value = true
  } catch {
    notify.error('Falha no envio', 'Não foi possível enviar o e-mail. Tente novamente.')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md">
      <div class="flex flex-col items-center gap-3 mb-8">
        <div
          class="w-16 h-16 rounded-xl bg-surface-raised border border-border flex items-center justify-center"
          aria-hidden="true"
        >
          <KeyRound class="w-8 h-8 text-text-secondary" :stroke-width="1.75" />
        </div>
        <div class="text-center">
          <h1 class="text-xl font-semibold text-text-primary">
            {{ loja?.nome_fantasia ?? 'Painel Administrativo' }}
          </h1>
          <p class="mt-1 text-sm text-text-secondary">Recuperar acesso à sua conta.</p>
        </div>
      </div>

      <div class="bg-surface-raised border border-border rounded-xl shadow-card p-6 sm:p-8">
        <!-- Estado de confirmação: mesma mensagem exista o e-mail ou não. -->
        <div v-if="sent" class="text-center">
          <h2 class="text-base font-semibold text-text-primary">Verifique seu e-mail</h2>
          <p class="mt-2 text-sm text-text-secondary">
            Se houver uma conta associada a <strong class="text-text-primary">{{ email }}</strong>,
            enviamos um link para redefinir a senha. Confira também a caixa de spam.
          </p>
          <NuxtLink
            to="/admin/login"
            class="mt-6 inline-flex items-center justify-center w-full px-4 py-2.5 rounded-md bg-interactive-primary text-text-inverse font-medium hover:bg-interactive-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
          >
            Voltar para o login
          </NuxtLink>
        </div>

        <form v-else class="space-y-5" novalidate @submit.prevent="handleSubmit">
          <p class="text-sm text-text-secondary">
            Informe o e-mail da sua conta e enviaremos um link para definir uma nova senha.
          </p>

          <div>
            <UiLabel for="recover-email" required>E-mail</UiLabel>
            <div class="mt-2 relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Mail class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              </span>
              <input
                id="recover-email"
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

          <button
            type="submit"
            :disabled="loading || !email.trim()"
            :aria-busy="loading"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-interactive-primary text-text-inverse font-medium hover:bg-interactive-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {{ loading ? 'Enviando…' : 'Enviar link de recuperação' }}
          </button>

          <div class="text-center">
            <NuxtLink
              to="/admin/login"
              class="text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Voltar para o login
            </NuxtLink>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
