export interface S3Config {
  region: string
  endpoint?: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  avatarBucketName: string
  attachmentsBucketName: string
}

export interface UploadOptions {
  fileSize: number
  mimeType: string
  fileName: string
  bucket: string
  uploadedBy: string
}

export interface UploadResult {
  key: string
  url: string
  bucket: string
}

export type FileInput = Buffer | NodeJS.ReadableStream | ReadableStream<Uint8Array>
