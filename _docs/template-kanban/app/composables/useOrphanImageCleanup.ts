import { watch } from 'vue'

/**
 * Limpeza best-effort de imagens órfãs no S3 para formulários com galeria.
 *
 * Rastreia todas as URLs que passaram pelo campo de fotos nesta sessão de edição
 * (galeria carregada + enviadas). No `cleanup`, as que não estão na galeria final
 * salva são deletadas via `DELETE /api/admin/upload` — cobre tanto imagem removida
 * de um registro existente quanto imagem enviada e removida antes de salvar.
 *
 * Fonte única compartilhada por produtos e kits (DRY). Falha de limpeza não bloqueia
 * o fluxo: é logada no server e o órfão pode ser varrido depois.
 *
 * @param fotosGetter getter reativo da galeria atual do formulário (ex: `() => form.value.fotos`).
 */
export function useOrphanImageCleanup(fotosGetter: () => readonly string[]) {
  const seen = new Set<string>()

  watch(
    fotosGetter,
    (fotos) => {
      for (const u of fotos) if (u) seen.add(u)
    },
    { immediate: true },
  )

  async function cleanup(finalFotos: readonly string[]): Promise<void> {
    const finais = new Set(finalFotos)
    const orphans = [...seen].filter((u) => u.length > 0 && !finais.has(u))
    if (orphans.length === 0) return
    try {
      await $fetch('/api/admin/upload', { method: 'DELETE', body: { urls: orphans } })
      for (const u of orphans) seen.delete(u)
    } catch (err: unknown) {
      console.error('Falha ao limpar imagens órfãs do storage', err)
    }
  }

  return { cleanup }
}
