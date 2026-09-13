/**
 * Formatação canônica do número de pedido exibido ao usuário.
 * Fonte única (DRY): kanban, tabela, histórico, ficha do cliente, recibos
 * (visual, térmico e texto/WhatsApp) e página de sucesso do catálogo.
 *
 * `short_id` é a sequência amigável de 5 dígitos (migration 074). O prefixo do
 * UUID permanece apenas como fallback para pedidos criados antes da migration.
 */
export function formatOrderNumber(id: string, shortId?: number | null): string {
  if (shortId) return String(shortId)
  return id.split('-')[0]?.toUpperCase() ?? id
}
