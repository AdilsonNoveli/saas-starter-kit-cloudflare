<script setup lang="ts">
/**
 * @descricao: Aba "Usuários" das configurações da loja.
 * @objetivo: Convite, edição, ativação e exclusão de usuários do painel.
 *
 * Não toca `loja`: tudo aqui passa por `/api/admin/users`, que já valida papel
 * no servidor. Por isso esta página não tem "Salvar Alterações" — cada ação
 * grava sozinha, como antes do split (§8.19 de `_docs/em-andamento.md`).
 */
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { Plus, Search, Pencil, Power, PowerOff, Trash2 } from '@lucide/vue'
import { useNotification } from '~/composables/useNotification'
import { useCurrentUser } from '~/composables/useCurrentUser'
import type { Option as SelectOption } from '~/components/ui/Select.vue'
import {
  USER_ROLES,
  ROLE_LABELS,
  type UserRole,
  type UserListItem,
  type UsersResponse,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '~~/shared/types/user'

const { notify, confirm } = useNotification()
const authUser = useSupabaseUser()
const { user: currentUser } = useCurrentUser()

const isSelfUser = (u: UserListItem): boolean => {
  if (authUser.value?.id && u.id === authUser.value.id) return true
  if (currentUser.value?.id && u.id === currentUser.value.id) return true
  if (authUser.value?.email && u.email && u.email.toLowerCase() === authUser.value.email.toLowerCase()) return true
  return false
}

const userSaving = ref<boolean>(false)
const usersLoading = ref<boolean>(false)
const users = ref<UserListItem[]>([])
const searchFilter = ref<string>('')
const roleFilter = ref<UserRole | ''>('')
const statusFilter = ref<'' | 'true' | 'false'>('')
const modalOpen = ref<boolean>(false)
const editingId = ref<string | null>(null)

interface UserForm {
  email: string
  nome: string
  role: UserRole
  whatsapp: string
  ativo: boolean
}

const userForm = reactive<UserForm>({
  email: '',
  nome: '',
  role: 'atendente',
  whatsapp: '',
  ativo: true,
})

const isEditing = computed<boolean>(() => editingId.value !== null)

const roleOptions: SelectOption[] = [
  { value: '', label: 'Todos os papéis' },
  ...USER_ROLES.map((r) => ({ value: r, label: ROLE_LABELS[r] })),
]

const userStatusOptions: SelectOption[] = [
  { value: '', label: 'Todos os status' },
  { value: 'true', label: 'Ativos' },
  { value: 'false', label: 'Inativos' },
]

async function loadUsers(): Promise<void> {
  usersLoading.value = true
  try {
    const res = await $fetch<UsersResponse>('/api/admin/users', {
      query: {
        ...(searchFilter.value ? { q: searchFilter.value } : {}),
        ...(roleFilter.value ? { role: roleFilter.value } : {}),
        ...(statusFilter.value ? { ativo: statusFilter.value } : {}),
      },
    })
    users.value = [...(res.data ?? [])]
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao carregar usuários', message)
  } finally {
    usersLoading.value = false
  }
}

watch([searchFilter, roleFilter, statusFilter], () => {
  void loadUsers()
})

onMounted(() => {
  void loadUsers()
})

function openCreateModal(): void {
  editingId.value = null
  userForm.email = ''
  userForm.nome = ''
  userForm.role = 'atendente'
  userForm.whatsapp = ''
  userForm.ativo = true
  modalOpen.value = true
}

function openEditModal(u: UserListItem): void {
  editingId.value = u.id
  userForm.email = u.email ?? ''
  userForm.nome = u.nome ?? ''
  userForm.role = u.role
  userForm.whatsapp = u.whatsapp ?? ''
  userForm.ativo = u.ativo
  modalOpen.value = true
}

async function saveUser(): Promise<void> {
  if (!userForm.nome.trim()) {
    notify.warning('Informe o nome do usuário.')
    return
  }
  if (!isEditing.value && !userForm.email.trim()) {
    notify.warning('Informe o e-mail do usuário.')
    return
  }
  userSaving.value = true
  try {
    if (isEditing.value && editingId.value) {
      const payload: UpdateUserPayload = {
        nome: userForm.nome.trim(),
        role: userForm.role,
        whatsapp: userForm.whatsapp.trim() || null,
        ativo: userForm.ativo,
      }
      await $fetch(`/api/admin/users/${editingId.value}`, { method: 'PUT', body: payload })
      notify.success('Usuário atualizado')
    } else {
      const payload: CreateUserPayload = {
        email: userForm.email.trim(),
        nome: userForm.nome.trim(),
        role: userForm.role,
        whatsapp: userForm.whatsapp.trim() || undefined,
      }
      await $fetch('/api/admin/users', { method: 'POST', body: payload })
      notify.success('Convite enviado', 'O usuário receberá um e-mail para definir a senha.')
    }
    modalOpen.value = false
    await loadUsers()
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao salvar', message || 'Tente novamente.')
  } finally {
    userSaving.value = false
  }
}

async function toggleUserStatus(u: UserListItem): Promise<void> {
  if (isSelfUser(u) && u.ativo) {
    notify.warning('Ação não permitida', 'Você não pode desativar a sua própria conta logada.')
    return
  }
  const willDeactivate = u.ativo
  const ok = await confirm({
    title: willDeactivate ? 'Desativar usuário?' : 'Reativar usuário?',
    message: willDeactivate
      ? `${u.nome ?? 'O usuário'} perderá o acesso ao sistema.`
      : `${u.nome ?? 'O usuário'} terá o acesso restaurado.`,
    variant: willDeactivate ? 'error' : 'success',
    confirmText: willDeactivate ? 'Desativar' : 'Reativar',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/users/${u.id}`, {
      method: 'PUT',
      body: { ativo: !u.ativo } satisfies UpdateUserPayload,
    })
    notify.success(willDeactivate ? 'Usuário desativado' : 'Usuário reativado')
    await loadUsers()
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao alterar status', message || 'Tente novamente.')
  }
}

async function confirmDeleteUser(u: UserListItem): Promise<void> {
  if (isSelfUser(u)) {
    notify.warning('Ação não permitida', 'Você não pode excluir a sua própria conta logada.')
    return
  }
  const ok = await confirm({
    title: 'Excluir usuário',
    message: `Tem certeza que deseja excluir permanentemente a conta de "${u.nome || u.email}"? Esta ação não poderá ser desfeita.`,
    variant: 'error',
    confirmText: 'Excluir',
  })
  if (!ok) return
  try {
    await $fetch(`/api/admin/users/${u.id}`, {
      method: 'DELETE',
    })
    notify.success('Usuário excluído com sucesso')
    await loadUsers()
  } catch (err) {
    const message = (err as { data?: { statusMessage?: string } })?.data?.statusMessage
    notify.error('Erro ao excluir usuário', message || 'Tente novamente.')
  }
}

function getUserInitials(name: string | null): string {
  if (!name) return 'US'
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 1) return (parts[0] ?? '').substring(0, 2).toUpperCase()
  return ((parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '')).toUpperCase()
}
</script>

<template>
  <main class="flex-1 w-full max-w-4xl mx-auto px-6 py-8 pb-32">
    <section class="-mx-6 -mt-8">

      <!-- Toolbar: + | search | filtros -->
      <div class="flex items-center gap-3 px-6 pt-6 pb-4 flex-wrap">
        <button
          type="button"
          class="bg-brand-green text-white p-2 rounded-lg hover:bg-brand-greenDark transition-colors shrink-0 active:scale-95"
          title="Novo usuário"
          @click="openCreateModal"
        >
          <Plus class="w-5 h-5" />
        </button>

        <div class="relative flex-1 min-w-[200px]">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <label for="users-search" class="sr-only">Buscar por nome</label>
          <input
            id="users-search"
            v-model="searchFilter"
            type="text"
            placeholder="Buscar por nome..."
            class="block w-full pl-9 pr-3 py-2 border border-border rounded-lg bg-surface text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green transition-all"
          >
        </div>

        <div class="w-44 shrink-0">
          <UiSelect
            :model-value="roleFilter"
            :options="roleOptions"
            aria-label="Filtrar por papel"
            size="md"
            @update:model-value="(v) => { roleFilter = v as UserRole | '' }"
          />
        </div>
        <div class="w-40 shrink-0">
          <UiSelect
            :model-value="statusFilter"
            :options="userStatusOptions"
            aria-label="Filtrar por status"
            size="md"
            @update:model-value="(v) => { statusFilter = v as '' | 'true' | 'false' }"
          />
        </div>
      </div>

      <!-- Loading -->
      <div v-if="usersLoading" class="flex items-center justify-center h-64">
        <div class="w-8 h-8 border-2 border-border border-t-text-primary rounded-full animate-spin" />
      </div>

      <!-- Empty -->
      <div v-else-if="users.length === 0" class="flex flex-col items-center justify-center h-64 gap-3 text-text-muted">
        <svg class="w-10 h-10 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span class="text-sm">Nenhum usuário encontrado</span>
      </div>

      <!-- Tabela -->
      <div v-else class="overflow-auto mx-6 rounded-lg border border-border bg-surface">
        <table class="w-full text-left border-collapse min-w-[680px]">
          <thead>
            <tr class="border-b border-border bg-surface-raised">
              <th class="px-6 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Usuário</th>
              <th class="px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Papel</th>
              <th class="px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider hidden sm:table-cell">WhatsApp</th>
              <th class="px-4 py-2.5 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Status</th>
              <th class="px-4 py-2.5 text-right text-[11px] font-semibold text-text-muted uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-border bg-surface">
            <tr
              v-for="u in users"
              :key="u.id"
              class="hover:bg-surface-raised/50 transition-colors group"
            >
              <td class="px-6 py-3.5">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-xs shrink-0 overflow-hidden dark:bg-primary-900/30 dark:text-primary-400">
                    <NuxtImg v-if="u.avatar_url" :src="u.avatar_url" alt="" loading="lazy" class="w-full h-full object-cover" />
                    <span v-else>{{ getUserInitials(u.nome) }}</span>
                  </div>
                  <div class="flex flex-col min-w-0">
                    <span class="text-sm font-medium text-text-primary truncate leading-snug">{{ u.nome || 'Sem nome' }}</span>
                    <span class="text-xs text-text-muted truncate leading-snug">{{ u.email || '—' }}</span>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3.5 text-sm text-text-secondary">{{ ROLE_LABELS[u.role] }}</td>
              <td class="px-4 py-3.5 text-sm text-text-muted hidden sm:table-cell">{{ u.whatsapp || '—' }}</td>
              <td class="px-4 py-3.5">
                <span
                  class="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-semibold uppercase tracking-wider"
                  :class="u.ativo
                    ? 'bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400'
                    : 'bg-surface-raised text-text-muted border border-border'"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="u.ativo ? 'bg-secondary-500' : 'bg-text-muted'" />
                  {{ u.ativo ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
              <td class="px-4 py-3.5 text-right">
                <div class="inline-flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    class="p-1.5 rounded-lg text-text-muted hover:text-brand-green hover:bg-surface-raised transition-colors active:scale-95"
                    title="Editar"
                    @click="openEditModal(u)"
                  >
                    <Pencil class="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    class="p-1.5 rounded-lg transition-colors active:scale-95"
                    :class="u.ativo
                      ? 'text-text-muted hover:text-red-600 hover:bg-red-50'
                      : 'text-text-muted hover:text-secondary-600 hover:bg-secondary-50'"
                    :title="u.ativo ? 'Desativar' : 'Reativar'"
                    @click="toggleUserStatus(u)"
                  >
                    <PowerOff v-if="u.ativo" class="w-4 h-4" />
                    <Power v-else class="w-4 h-4" />
                  </button>
                  <button
                    v-if="!isSelfUser(u)"
                    type="button"
                    class="p-1.5 rounded-lg text-text-muted hover:text-red-600 hover:bg-red-50 transition-colors active:scale-95"
                    title="Excluir Usuário"
                    @click="confirmDeleteUser(u)"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Modal Criar/Editar Usuário -->
    <UiModal
      :open="modalOpen"
      :title="isEditing ? 'Editar Usuário' : 'Novo Usuário'"
      size="md"
      @close="modalOpen = false"
    >
      <div class="space-y-4">
        <div v-if="!isEditing">
          <label for="user-email" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">E-mail *</label>
          <input
            id="user-email"
            v-model="userForm.email"
            type="email"
            autocomplete="off"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm"
            placeholder="usuario@empresa.com"
          >
          <p class="text-xs text-text-muted mt-1">Um convite será enviado para este e-mail.</p>
        </div>
        <div v-else>
          <p class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">E-mail</p>
          <p class="text-sm text-text-secondary py-2">{{ userForm.email || '—' }}</p>
        </div>
        <div>
          <label for="user-name" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Nome *</label>
          <input
            id="user-name"
            v-model="userForm.nome"
            type="text"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm"
            placeholder="Nome completo"
          >
        </div>
        <div>
          <label for="user-role" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">Papel *</label>
          <select
            id="user-role"
            v-model="userForm.role"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm"
          >
            <option v-for="r in USER_ROLES" :key="r" :value="r">{{ ROLE_LABELS[r] }}</option>
          </select>
        </div>
        <div>
          <label for="user-whatsapp" class="block text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">WhatsApp</label>
          <input
            id="user-whatsapp"
            v-model="userForm.whatsapp"
            type="text"
            class="w-full px-3.5 py-2 border border-border rounded-lg bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:border-brand-green text-sm"
            placeholder="5511999999999"
          >
        </div>
      </div>
      <template #footer>
        <button
          type="button"
          class="px-4 py-2 rounded-lg border border-border text-text-primary hover:bg-surface-raised transition-colors text-sm font-medium active:scale-95"
          @click="modalOpen = false"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="px-4 py-2 rounded-lg bg-brand-green hover:bg-brand-greenDark text-white transition-colors disabled:opacity-50 flex items-center gap-2 text-sm font-medium active:scale-95 shadow-xs"
          :disabled="userSaving"
          @click="saveUser"
        >
          <span v-if="userSaving" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          {{ isEditing ? 'Salvar' : 'Enviar Convite' }}
        </button>
      </template>
    </UiModal>
  </main>
</template>
