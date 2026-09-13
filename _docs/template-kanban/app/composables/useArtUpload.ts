import { ref } from 'vue'

interface UploadArteResponse {
  success: boolean
  data: { url: string; key: string; nomeOriginal: string; mimeType: string }
}

const MIME_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
}

/**
 * Envia um arquivo de arte (PDF/imagem) para `/api/catalog/upload-arte` e
 * devolve `{ url, key, nomeOriginal }`. Paralelo a `useImageUpload.ts`, mas
 * NÃO o reaproveita — aquele bloqueia qualquer arquivo não-imagem
 * (`useImageUpload.ts:19`) e usa o endpoint staff-only `/api/admin/upload`.
 *
 * Validação client-side é só UX (feedback imediato) — o servidor nunca
 * confia nela e revalida com sua própria whitelist fixa.
 */
export function useArtUpload() {
  const uploading = ref<boolean>(false)
  const error = ref<string>('')

  async function uploadArte(
    file: File,
    acceptedMimeTypes: readonly string[],
    maxSizeMb: number,
  ): Promise<{ url: string; key: string; nomeOriginal: string; mimeType: string } | null> {
    if (!acceptedMimeTypes.includes(file.type)) {
      const labels = acceptedMimeTypes.map((t) => MIME_LABELS[t] ?? t).join(', ')
      error.value = `Formato não aceito. Envie um arquivo: ${labels}.`
      return null
    }

    if (file.size > maxSizeMb * 1024 * 1024) {
      error.value = `Arquivo muito grande (máx. ${maxSizeMb}MB).`
      return null
    }

    error.value = ''
    uploading.value = true

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await $fetch<UploadArteResponse>('/api/catalog/upload-arte', {
        method: 'POST',
        body: formData,
      })

      if (!response.success || !response.data?.url) {
        throw new Error('Falha ao processar upload')
      }

      return response.data
    } catch (err: unknown) {
      const errorObj = err as { data?: { statusMessage?: string }; message?: string }
      error.value = errorObj.data?.statusMessage || errorObj.message || 'Erro ao enviar arquivo.'
      return null
    } finally {
      uploading.value = false
    }
  }

  async function removeArte(key: string): Promise<void> {
    try {
      await $fetch('/api/catalog/upload-arte', { method: 'DELETE', body: { key } })
    } catch {
      // Best-effort: limpeza de storage não deve bloquear o fluxo do cliente.
    }
  }

  return { uploading, error, uploadArte, removeArte }
}
