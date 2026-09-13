<script setup lang="ts">
/**
 * @descricao: Perfil do próprio usuário (Fase 6.2).
 * @objetivo: Editar nome, avatar (S3 + NuxtImg) e whatsapp; alterar a própria
 *   senha via `supabase.auth.updateUser`. Atualiza `usuarios` via endpoint que
 *   restringe os campos editáveis (não permite trocar papel/status).
 */
import { ref, reactive, watch, computed, onMounted } from 'vue'
import { ArrowLeft, User, Lock, Save, ShieldCheck } from '@lucide/vue'
import { useRouter } from 'vue-router'
import { useNotification } from '~/composables/useNotification'
import { useCurrentUser } from '~/composables/useCurrentUser'
import { ROLE_LABELS, PASSWORD_MIN, type UserRow } from '~~/shared/types/user'

definePageMeta({ layout: 'admin' })

const router = useRouter()
const { notify } = useNotification()
const supabase = useSupabaseClient()
const authUser = useSupabaseUser()
const { user, fetch: fetchUser } = useCurrentUser()

const loading = ref<boolean>(true)
const savingProfile = ref<boolean>(false)
const savingPassword = ref<boolean>(false)

const form = reactive<{ nome: string; avatar_url: string | null; whatsapp: string }>({
  nome: '',
  avatar_url: null,
  whatsapp: '',
})

const password = reactive<{ next: string; confirm: string }>({ next: '', confirm: '' })

const userRoleLabel = computed<string>(() => {
  if (user.value?.role && ROLE_LABELS[user.value.role]) {
    return ROLE_LABELS[user.value.role]
  }
  return 'Administrador'
})

let avatarInitialized = false

async function loadProfile(): Promise<void> {
  loading.value = true
  try {
    const u = await fetchUser({ force: true })
    if (u) {
      form.nome = u.nome ?? ''
      form.avatar_url = u.avatar_url ?? null
      form.whatsapp = u.whatsapp ?? ''
    }

    // Fallback: se o nome no banco estiver vazio, usa os metadados do login
    if (!form.nome && authUser.value) {
      const meta = authUser.value.user_metadata
      form.nome = meta?.nome || meta?.full_name || authUser.value.email?.split('@')[0] || ''
    }
  } finally {
    loading.value = false
    avatarInitialized = true
  }
}

onMounted(() => {
  void loadProfile()
})

watch(
  () => authUser.value?.id,
  (newId) => {
    if (newId && (!form.nome || !user.value)) {
      void loadProfile()
    }
  }
)

watch(
  () => form.avatar_url,
  async (newUrl) => {
    if (!avatarInitialized) return
    if (!newUrl) return
    try {
      const res = await $fetch<{ success: boolean; user: UserRow }>('/api/admin/profile', {
        method: 'PUT',
        body: { avatar_url: newUrl },
      })
      user.value = res.user
      notify.success('Foto atualizada')
    } catch {
      notify.error('Erro ao salvar foto')
    }
  }
)

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/admin/dashboard')
  }
}

async function saveProfile(): Promise<void> {
  if (!form.nome.trim()) {
    notify.warning('Informe seu nome.')
    return
  }
  savingProfile.value = true
  try {
    const res = await $fetch<{ success: boolean; user: UserRow }>('/api/admin/profile', {
      method: 'PUT',
      body: {
        nome: form.nome.trim(),
        avatar_url: form.avatar_url,
        whatsapp: form.whatsapp.trim() || null,
      },
    })
    user.value = res.user
    notify.success('Perfil atualizado com sucesso')
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao salvar perfil', message || 'Tente novamente.')
  } finally {
    savingProfile.value = false
  }
}

async function changePassword(): Promise<void> {
  if (password.next.length < PASSWORD_MIN) {
    notify.warning(`A senha deve ter ao menos ${PASSWORD_MIN} caracteres.`)
    return
  }
  if (password.next !== password.confirm) {
    notify.warning('As senhas não coincidem.')
    return
  }
  savingPassword.value = true
  try {
    const { error } = await supabase.auth.updateUser({ password: password.next })
    if (error) {
      notify.error('Erro ao alterar senha', error.message)
      return
    }
    password.next = ''
    password.confirm = ''
    notify.success('Senha alterada com sucesso')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <div class="flex flex-col min-h-screen bg-surface text-text-primary font-sans">
    <!-- Header Sticky Enterprise Grade -->
    <header class="h-16 flex items-center justify-between px-6 border-b border-border bg-surface shrink-0 sticky top-0 z-20 select-none">
      <div class="flex items-center gap-3">
        <button
          type="button"
          class="w-8 h-8 flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:text-text-primary hover:bg-surface-raised transition-all active:scale-95 cursor-pointer"
          title="Voltar"
          aria-label="Voltar"
          @click="goBack"
        >
          <ArrowLeft class="w-4.5 h-4.5" />
        </button>
        <h1 class="text-xs font-bold text-text-primary uppercase tracking-wider">
          Meu Perfil
        </h1>
      </div>

      <div class="flex items-center gap-2">
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95 flex items-center gap-2 disabled:opacity-50"
          :disabled="savingProfile"
          @click="saveProfile"
        >
          <span v-if="savingProfile" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <Save v-else class="w-4 h-4" />
          {{ savingProfile ? 'Salvando…' : 'Salvar Alterações' }}
        </button>
      </div>
    </header>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="w-8 h-8 border-2 border-border border-t-brand-green rounded-full animate-spin" />
    </div>

    <main v-else class="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 space-y-6 animate-fade-in">
      <!-- Card 1: Dados Pessoais -->
      <section class="border border-border bg-surface-raised p-5 space-y-5 rounded-md shadow-xs">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <User class="w-4.5 h-4.5 text-brand-green" />
          <h2 class="text-sm font-bold text-text-primary uppercase tracking-wider">Dados Pessoais &amp; Identidade</h2>
        </div>

        <div class="flex flex-col md:flex-row gap-8 items-start">
          <div class="w-36 shrink-0 flex flex-col items-center">
            <label class="block text-xs font-bold text-text-muted uppercase tracking-wider mb-2 text-center">Foto de Perfil</label>
            <ImageUploader
              v-model="form.avatar_url"
              bucket="loja"
              placeholder-text="Upload Foto"
              shape="square"
              custom-class="h-36 w-36 shadow-sm border-2 border-border"
              :hide-url-input="true"
            />
          </div>

          <div class="flex-1 space-y-4 w-full">
            <div>
              <label for="profile-name" class="block text-xs font-semibold text-text-secondary mb-1.5">Nome Completo *</label>
              <input
                id="profile-name"
                v-model="form.nome"
                type="text"
                class="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                placeholder="Seu nome completo"
              >
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label for="profile-email" class="block text-xs font-semibold text-text-secondary mb-1.5">E-mail de Acesso</label>
                <input
                  id="profile-email"
                  :value="authUser?.email ?? ''"
                  type="text"
                  disabled
                  class="w-full px-3.5 py-2 rounded-lg border border-border bg-surface-raised text-sm text-text-muted cursor-not-allowed"
                >
              </div>
              <div>
                <label for="profile-role" class="block text-xs font-semibold text-text-secondary mb-1.5">Função no Sistema</label>
                <input
                  id="profile-role"
                  :value="userRoleLabel"
                  type="text"
                  disabled
                  class="w-full px-3.5 py-2 rounded-lg border border-border bg-surface-raised text-sm text-text-muted cursor-not-allowed"
                >
              </div>
            </div>

            <div>
              <label for="profile-whatsapp" class="block text-xs font-semibold text-text-secondary mb-1.5">WhatsApp / Contato</label>
              <input
                id="profile-whatsapp"
                v-model="form.whatsapp"
                type="text"
                class="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
                placeholder="Ex: 5511999999999"
              >
            </div>
          </div>
        </div>
      </section>

      <!-- Card 2: Seguranca & Alteracao de Senha -->
      <section class="border border-border bg-surface-raised p-5 space-y-5 rounded-md shadow-xs">
        <div class="flex items-center gap-2 border-b border-border pb-3">
          <Lock class="w-4.5 h-4.5 text-brand-green" />
          <h2 class="text-sm font-bold text-text-primary uppercase tracking-wider">Segurança &amp; Alterar Senha</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
          <div>
            <label for="profile-password" class="block text-xs font-semibold text-text-secondary mb-1.5">Nova Senha *</label>
            <input
              id="profile-password"
              v-model="password.next"
              type="password"
              autocomplete="new-password"
              class="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Mínimo 6 caracteres"
            >
          </div>
          <div>
            <label for="profile-password-confirm" class="block text-xs font-semibold text-text-secondary mb-1.5">Confirmar Nova Senha *</label>
            <input
              id="profile-password-confirm"
              v-model="password.confirm"
              type="password"
              autocomplete="new-password"
              class="w-full px-3.5 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20 transition-all"
              placeholder="Repita a nova senha"
            >
          </div>
        </div>

        <div class="pt-1 flex justify-start">
          <button
            type="button"
            class="px-4 py-2 rounded-lg border border-border bg-surface hover:bg-surface-raised text-text-primary text-xs font-bold uppercase tracking-wider transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-2"
            :disabled="savingPassword"
            @click="changePassword"
          >
            <span v-if="savingPassword" class="w-3.5 h-3.5 border-2 border-text-muted/30 border-t-text-primary rounded-full animate-spin" />
            <ShieldCheck v-else class="w-4 h-4 text-brand-green" />
            Alterar Senha
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
