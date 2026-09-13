/**
 * Resultado padrão dos `saveForProduct(produtoId)` das composables de
 * seção do formulário de produto (`useProductOptionGroups`,
 * `useProductRelated`, `useProductReceitaInsumos`). Tipo único e
 * compartilhado — declará-lo em cada composable colidia no auto-import
 * global do Nuxt (mesmo nome exportado por múltiplos arquivos).
 */
export interface SaveResult {
  success: boolean
  message?: string
}
