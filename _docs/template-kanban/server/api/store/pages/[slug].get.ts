import { serverSupabaseClient } from '#supabase/server'

const PLACEHOLDER_PAGES: Record<string, { slug: string; titulo: string; conteudo: string; atualizado_em: string }> = {
  termos: {
    slug: 'termos',
    titulo: 'Termos de Uso',
    conteudo: 'Os Termos de Uso serão publicados em breve.',
    atualizado_em: new Date().toISOString(),
  },
  privacidade: {
    slug: 'privacidade',
    titulo: 'Política de Privacidade',
    conteudo: 'A Política de Privacidade será publicada em breve.',
    atualizado_em: new Date().toISOString(),
  },
}

export default defineEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')
  if (!slug) {
    throw createError({ statusCode: 400, message: 'Slug é obrigatório' })
  }

  const supabase = await serverSupabaseClient(event)
  const { data: pagina, error } = await supabase
    .from('pages')
    .select('slug, titulo:title, conteudo:content, atualizado_em:updated_at')
    .eq('slug', slug)
    .maybeSingle()

  // Tabela ainda não existe no banco (migration não aplicada): retorna placeholder
  // para não bloquear o catálogo. Código de erro 42P01 = undefined_table (Postgres).
  if (error) {
    const placeholder = PLACEHOLDER_PAGES[slug]
    if (placeholder) return placeholder
    throw createError({ statusCode: 404, message: 'Página não encontrada' })
  }

  if (!pagina) {
    const placeholder = PLACEHOLDER_PAGES[slug]
    if (placeholder) return placeholder
    throw createError({ statusCode: 404, message: 'Página não encontrada' })
  }

  return pagina
})
