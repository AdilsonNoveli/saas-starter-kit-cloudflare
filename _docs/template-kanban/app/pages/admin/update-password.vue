<!--
  @descricao: Definição de nova senha após verificação do link de e-mail.
  @objetivo: Destino único de `/auth/confirm` tanto para recuperação quanto
    para convite — em ambos os casos o usuário chega autenticado e sem senha
    utilizável, então a tela é a mesma.

    Fica sob `/admin` de propósito: o middleware `admin.global` já exige sessão,
    de modo que abrir esta URL sem um link válido redireciona ao login em vez de
    expor o formulário.
-->

<script setup lang="ts">
import { ref } from 'vue'
import { KeyRound, Lock } from '@lucide/vue'
import { navigateTo } from 'nuxt/app'
import { useStore } from '~/composables/useStore'
import { useNotification } from '~/composables/useNotification'
import { PASSWORD_MIN } from '~~/shared/types/user'

definePageMeta({ layout: false })

const supabase = useSupabaseClient()
const { loja } = useStore()
const { notify } = useNotification()

const next = ref('')
const confirm = ref('')
const saving = ref(false)

const handleSubmit = async (): Promise<void> => {
  if (saving.value) return

  if (next.value.length < PASSWORD_MIN) {
    notify.warning(`A senha deve ter ao menos ${PASSWORD_MIN} caracteres.`)
    return
  }
  if (next.value !== confirm.value) {
    notify.warning('As senhas não coincidem.')
    return
  }

  saving.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: next.value })
    if (error) {
      notify.error('Erro ao definir senha', error.message)
      return
    }
    notify.success('Senha definida com sucesso')
    await navigateTo('/admin/orders', { replace: true })
  } finally {
    // `finally` evita que uma falha de rede deixe o botão travado.
    saving.value = false
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
          <p class="mt-1 text-sm text-text-secondary">Defina sua nova senha para continuar.</p>
        </div>
      </div>

      <div class="bg-surface-raised border border-border rounded-xl shadow-card p-6 sm:p-8">
        <form class="space-y-5" novalidate @submit.prevent="handleSubmit">
          <div>
            <UiLabel for="new-password" required>Nova senha</UiLabel>
            <div class="mt-2 relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              </span>
              <input
                id="new-password"
                v-model="next"
                type="password"
                autocomplete="new-password"
                required
                :disabled="saving"
                :placeholder="`Ao menos ${PASSWORD_MIN} caracteres`"
                class="block w-full pl-10 pr-3 py-2.5 rounded-md border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
            </div>
          </div>

          <div>
            <UiLabel for="confirm-password" required>Confirme a nova senha</UiLabel>
            <div class="mt-2 relative">
              <span class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-muted">
                <Lock class="w-4 h-4" :stroke-width="2" aria-hidden="true" />
              </span>
              <input
                id="confirm-password"
                v-model="confirm"
                type="password"
                autocomplete="new-password"
                required
                :disabled="saving"
                placeholder="Repita a senha"
                class="block w-full pl-10 pr-3 py-2.5 rounded-md border border-border bg-surface text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
            </div>
          </div>

          <button
            type="submit"
            :disabled="saving"
            :aria-busy="saving"
            class="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-interactive-primary text-text-inverse font-medium hover:bg-interactive-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {{ saving ? 'Salvando…' : 'Definir senha' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>
