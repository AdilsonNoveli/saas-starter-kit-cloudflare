/**
 * S3 Client — aws4fetch
 *
 * aws4fetch usa Fetch API + Web Crypto API nativos: compatível com o runtime
 * workerd (Cloudflare Workers) e Node.js sem polyfills.
 *
 * @aws-sdk/client-s3 chama process.emitWarning (de @smithy/util-user-agent-node)
 * no nível de módulo — quebra no workerd mesmo com nodejs_compat.
 *
 * O auto-detect de region/service pelo hostname está documentado em aws4fetch:
 * padrão "s3.region.backblazeb2.com" → ['s3', 'region'] automaticamente.
 * Passamos explicitamente como fallback caso o hostname não siga o padrão.
 *
 * Docs: https://github.com/mhart/aws4fetch
 *       https://developers.cloudflare.com/r2/examples/aws/aws4fetch/
 */

import { AwsClient } from 'aws4fetch'
import { getS3Config } from './config'

let client: AwsClient | null = null

export function getS3Client(): AwsClient {
  if (!client) {
    const cfg = getS3Config()
    client = new AwsClient({
      accessKeyId: cfg.accessKeyId,
      secretAccessKey: cfg.secretAccessKey,
      region: cfg.region,
      service: 's3',
      // Desativa o retry interno: usamos nosso próprio retry loop com
      // logging detalhado e categorização de erros por código HTTP.
      retries: 0,
    })
  }
  return client
}

export function closeS3Client(): void {
  client = null
}

/**
 * Monta a URL do objeto para operações S3 (PUT, DELETE, GET).
 * path-style: `${endpoint}/${bucket}/${key}` (obrigatório para B2 e MinIO).
 * virtual-hosted: `https://${bucket}.${host}/${key}` (padrão AWS).
 */
export function buildObjectUrl(bucket: string, key: string): string {
  const cfg = getS3Config()
  if (cfg.forcePathStyle) {
    // Remove trailing slash do endpoint antes de concatenar
    return `${cfg.endpoint!.replace(/\/$/, '')}/${bucket}/${key}`
  }
  // Virtual-hosted style: insere o bucket como subdomínio do endpoint
  const url = new URL(cfg.endpoint!)
  return `${url.protocol}//${bucket}.${url.host}/${key}`
}
