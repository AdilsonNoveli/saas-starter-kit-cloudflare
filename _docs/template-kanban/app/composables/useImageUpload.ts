import { ref } from 'vue'

interface UploadResponse {
  success: boolean
  data: { url: string; key: string }
}

/**
 * Envia uma imagem para o endpoint S3 (`/api/admin/upload`) e devolve a URL pública.
 * Encapsula validação de tipo, estado de envio e mensagem de erro — fonte única
 * reutilizada pelo `ImageUploader` (single) e pelo `ProductImageManager` (galeria),
 * evitando duplicar o fluxo de upload em cada componente (DRY).
 */
export function useImageUpload() {
  const uploading = ref<boolean>(false)
  const error = ref<string>('')

  async function uploadImage(file: File, bucket?: string): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      error.value = 'Selecione uma imagem válida (PNG, JPG, etc).'
      return null
    }

    error.value = ''
    uploading.value = true

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (bucket) formData.append('bucketTarget', bucket)

      const response = await $fetch<UploadResponse>('/api/admin/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.success || !response.data?.url) {
        throw new Error('Falha ao processar upload')
      }

      return response.data.url
    } catch (err: unknown) {
      const errorObj = err as { data?: { statusMessage?: string }; message?: string }
      error.value = errorObj.data?.statusMessage || errorObj.message || 'Erro ao enviar imagem.'
      return null
    } finally {
      uploading.value = false
    }
  }

  return { uploading, error, uploadImage }
}
