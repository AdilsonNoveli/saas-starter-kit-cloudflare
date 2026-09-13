<!--
  @descricao: Ponto de aterrissagem dos links de e-mail do Supabase Auth.
  @objetivo: Trocar o `token_hash` do link por uma sessão real via `verifyOtp`
    e encaminhar o usuário ao destino correto. É o mecanismo único para
    convite (`invite`) e recuperação de senha (`recovery`) — ambos os e-mails
    apontam para cá, então só existe um caminho de verificação para manter.

    Usa o fluxo `token_hash` da documentação oficial em vez do fluxo implícito
    por hash de URL: o token não fica no fragmento, não vaza via `Referer` e a
    verificação é explícita em vez de efeito colateral do `detectSessionInUrl`.
-->

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { navigateTo, useRoute } from 'nuxt/app'
import type { EmailOtpType } from '@supabase/supabase-js'
import { ShieldCheck, TriangleAlert } from '@lucide/vue'

definePageMeta({ layout: false })

const route = useRoute()
const supabase = useSupabaseClient()
const user = useSupabaseUser()

type SupabaseUserRef = ReturnType<typeof useSupabaseUser>

/** Janela máxima de espera pela sessão do fluxo de fragmento. */
const SESSION_WAIT_MS = 3000

/**
 * Resolve `true` assim que a sessão aparecer, ou `false` após `SESSION_WAIT_MS`.
 * Necessário porque `detectSessionInUrl` popula o usuário de forma assíncrona no
 * boot do cliente — um `getSession()` de leitura única correria à frente dele.
 */
function waitForSession(userRef: SupabaseUserRef): Promise<boolean> {
  if (userRef.value) return Promise.resolve(true)
  return new Promise((resolve) => {
    const stop = watch(userRef, (value) => {
      if (value) {
        clearTimeout(timer)
        stop()
        resolve(true)
      }
    })
    const timer = setTimeout(() => {
      stop()
      resolve(Boolean(userRef.value))
    }, SESSION_WAIT_MS)
  })
}

const errorMsg = ref('')

/** Tipos de OTP por e-mail aceitos neste projeto. */
const ALLOWED_TYPES: readonly EmailOtpType[] = ['invite', 'recovery', 'signup', 'email_change']

/**
 * Destino pós-verificação. Restrito a caminhos internos: `next` vem da query
 * string (entrada do usuário) e permitiria open-redirect. `//host` é rejeitado
 * porque o browser o trata como URL absoluta protocol-relative.
 */
function safeNext(): string {
  const raw = route.query.next
  const next = typeof raw === 'string' ? raw : ''
  return next.startsWith('/') && !next.startsWith('//') ? next : '/admin/update-password'
}

onMounted(async () => {
  const rawToken = route.query.token_hash
  const rawType = route.query.type
  const tokenHash = typeof rawToken === 'string' ? rawToken : ''
  const type = typeof rawType === 'string' ? (rawType as EmailOtpType) : null

  if (tokenHash && type && ALLOWED_TYPES.includes(type)) {
    // Fluxo `token_hash`: exige templates de e-mail usando `{{ .TokenHash }}`.
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) {
      // Não repassamos a mensagem do Supabase: ela distingue "expirado" de
      // "inválido", o que ajudaria um atacante a sondar tokens.
      errorMsg.value = 'Este link expirou ou já foi utilizado. Solicite um novo e-mail.'
      return
    }
  } else {
    // Fallback para os templates padrão do Supabase (`{{ .ConfirmationURL }}`),
    // que entregam a sessão no fragmento da URL. Esperamos o `detectSessionInUrl`
    // popular a sessão (assíncrono) em vez de ler uma única vez e correr à frente
    // dele. Sem este ramo, quem não customizar os templates falharia num link
    // válido.
    const authenticated = await waitForSession(user)
    if (!authenticated) {
      errorMsg.value = 'Link inválido ou expirado. Solicite um novo e-mail.'
      return
    }
  }

  await navigateTo(safeNext(), { replace: true })
})
</script>

<template>
  <div class="min-h-screen bg-surface flex items-center justify-center px-4">
    <div class="w-full max-w-md text-center">
      <template v-if="errorMsg">
        <div
          class="w-16 h-16 mx-auto rounded-xl bg-surface-raised border border-border flex items-center justify-center"
          aria-hidden="true"
        >
          <TriangleAlert class="w-8 h-8 text-alert" :stroke-width="1.75" />
        </div>
        <h1 class="mt-4 text-xl font-semibold text-text-primary">Não foi possível continuar</h1>
        <p class="mt-2 text-sm text-text-secondary" role="alert" aria-live="polite">
          {{ errorMsg }}
        </p>
        <NuxtLink
          to="/auth/forgot-password"
          class="mt-6 inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-interactive-primary text-text-inverse font-medium hover:bg-interactive-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        >
          Solicitar novo link
        </NuxtLink>
      </template>

      <template v-else>
        <div
          class="w-16 h-16 mx-auto rounded-xl bg-surface-raised border border-border flex items-center justify-center"
          aria-hidden="true"
        >
          <ShieldCheck class="w-8 h-8 text-text-secondary" :stroke-width="1.75" />
        </div>
        <h1 class="mt-4 text-xl font-semibold text-text-primary">Verificando seu link…</h1>
        <p class="mt-2 text-sm text-text-secondary" aria-live="polite">
          Você será redirecionado em instantes.
        </p>
      </template>
    </div>
  </div>
</template>
