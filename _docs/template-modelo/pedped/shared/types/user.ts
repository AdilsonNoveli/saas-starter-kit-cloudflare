/**
 * Contratos compartilhados de `usuarios` (perfil + RBAC) — Fase 6.1/6.2.
 *
 * Tipos manuais (database.types.ts ainda é placeholder neste projeto).
 * Espelha a tabela `public.usuarios` e o `role_usuario_enum` (migration 003).
 *
 * Convenção: identificadores TypeScript em inglês; nomes de campos seguem o
 * schema (Portuguese) por contrato com o banco.
 */

/**
 * Papéis do sistema — espelha `role_usuario_enum` (migration 003), na mesma
 * ordem do enum no banco. Mantido como union literal para evitar typos.
 */
export const USER_ROLES = [
  'entregador',
  'atendente',
  'producao',
  'gerente',
  'administrador',
  'proprietario',
] as const
export type UserRole = (typeof USER_ROLES)[number]

/**
 * Papéis "staff" (equipe interna) — todos exceto `entregador`.
 * Espelha a função SQL `is_staff()` (migration 003). Fonte única para
 * `requireRole` em endpoints administrativos que operam com service_role
 * (bypass de RLS) e portanto precisam de checagem de papel explícita.
 */
export const STAFF_ROLES = [
  'atendente',
  'producao',
  'gerente',
  'administrador',
  'proprietario',
] as const

/**
 * Papéis com permissão de gerir usuários (criar/editar/desativar).
 * Fonte única usada por endpoints (`requireRole`) e pela UI.
 */
export const USER_MANAGEMENT_ROLES = ['administrador', 'proprietario'] as const

/**
 * Papéis autorizados a excluir permanentemente um cliente (hard-delete em
 * cascata: apaga o cliente + todo o histórico de pedidos). Operação
 * destrutiva e irreversível — restrita a gerência para cima, nunca a
 * atendente/produção. Fonte única usada por `requireRole`.
 */
export const CUSTOMER_DELETE_ROLES = ['gerente', 'administrador', 'proprietario'] as const

/**
 * Papéis que só o `proprietario` pode conceder ou modificar. Impede que um
 * `administrador` promova alguém a proprietário, ou altere/desative o
 * proprietário atual (escalonamento horizontal de privilégio). Verificado
 * explicitamente nos endpoints de gestão de usuários.
 */
export const OWNER_ONLY_ROLES = ['proprietario'] as const

/**
 * Tamanho mínimo de senha. Fonte única para todas as telas que definem ou
 * alteram senha (perfil, recuperação, convite) — sem isso cada tela adota o
 * próprio limite e a regra efetiva vira a mais frouxa.
 *
 * Deve permanecer >= ao mínimo configurado no Supabase Auth: um valor menor
 * aqui só produziria um erro vindo do servidor após o submit.
 */
export const PASSWORD_MIN = 6

/** Rótulos legíveis para exibição na UI (PT-BR). */
export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  entregador: 'Entregador',
  atendente: 'Atendente',
  producao: 'Produção',
  gerente: 'Gerente',
  administrador: 'Administrador',
  proprietario: 'Proprietário',
}

/** Linha base da tabela `usuarios` (campos = colunas do schema). */
export interface UserRow {
  readonly id: string
  readonly nome: string | null
  readonly avatar_url: string | null
  readonly whatsapp: string | null
  readonly role: UserRole
  readonly ativo: boolean
  readonly criado_em: string
  readonly atualizado_em: string
}

/** Item de usuário enriquecido com o e-mail (vindo de auth.users via Admin API). */
export interface UserListItem extends UserRow {
  readonly email: string | null
}

/** Resposta de `GET /api/admin/users`. */
export interface UsersResponse {
  readonly data: readonly UserListItem[]
  readonly total: number
}

/** Payload de criação (`POST /api/admin/users`) — dispara convite por e-mail. */
export interface CreateUserPayload {
  readonly email: string
  readonly nome: string
  readonly role: UserRole
  readonly whatsapp?: string
}

/** Payload de edição (`PUT /api/admin/users/[id]`). */
export interface UpdateUserPayload {
  readonly nome?: string
  readonly role?: UserRole
  readonly whatsapp?: string | null
  readonly ativo?: boolean
}
