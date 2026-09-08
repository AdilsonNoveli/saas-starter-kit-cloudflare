#!/usr/bin/env node
/**
 * Garante a sincronização de nomes e criação das Cloudflare Queues antes do
 * `wrangler deploy`.
 *
 * Suporte a Cloudflare Workers Builds, Cloudflare for Platforms (Multi-tenant SaaS)
 * e ambientes standalone:
 *
 * 1. Resolve o nome oficial do Worker (WORKERS_CI_OVERRIDE_NAME -> CLOUDFLARE_WORKER_NAME -> name no toml).
 * 2. Resolve `name = "..."` e os placeholders `{{WORKER_NAME}}` **só em memória** —
 *    nunca grava de volta em `wrangler.toml` (§5, armadilha nova de
 *    `_docs/em-andamento.md`: esse arquivo é COMMITADO com o placeholder
 *    intacto, de propósito, para que outra instalação deste mesmo código
 *    resolva para um nome diferente. `wrangler deploy` nunca lê este arquivo
 *    diretamente — `.output/server/wrangler.json` + `.wrangler/deploy/config.json`
 *    é o que ele de fato usa (ver `nuxt.config.ts`, comentário do preset
 *    `cloudflare-module`) — então gravar o nome resolvido aqui nunca foi
 *    necessário para o deploy funcionar, só um efeito colateral indesejado.
 * 3. Garante que todas as Queues declaradas existem na conta via CLI do wrangler
 *    (usa a versão resolvida em memória do passo 2, nunca lê o arquivo de volta).
 * 4. Sincroniza o arquivo gerado `.output/server/wrangler.json` (caso exista) —
 *    é este arquivo, não o `wrangler.toml` da raiz, que o `wrangler deploy` lê.
 * 5. Se DISABLE_CRON_TRIGGERS=true ou WORKERS_FOR_PLATFORMS=true, remove blocos de cron triggers incompátiveis com User Workers de plataforma (só em memória, mesma ressalva do passo 2 — feature não usada nesta instalação hoje).
 * 6. Antes de criar/reusar cada fila, confere via `wrangler queues info` quem é
 *    o consumer atual. Se já existir um Worker consumer **diferente** do que
 *    está sendo implantado agora, para o build (§8.1 de `_docs/em-andamento.md`:
 *    foi exatamente isso — duas instalações resolvendo para o mesmo nome de
 *    fila — que derrubou o WhatsApp em silêncio uma vez. Cloudflare Queues são
 *    escopadas por CONTA, não por Worker: sem este check, o deploy da segunda
 *    instalação rouba o binding de consumer da primeira sem avisar ninguém).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const wranglerTomlPath = path.join(__dirname, '..', 'wrangler.toml')
const nitroWranglerJsonPath = path.join(__dirname, '..', '.output', 'server', 'wrangler.json')

export function resolveWorkerName(tomlContent) {
  if (process.env.WORKERS_CI_OVERRIDE_NAME && process.env.WORKERS_CI_OVERRIDE_NAME.trim()) {
    return process.env.WORKERS_CI_OVERRIDE_NAME.trim()
  }
  if (process.env.CLOUDFLARE_WORKER_NAME && process.env.CLOUDFLARE_WORKER_NAME.trim()) {
    return process.env.CLOUDFLARE_WORKER_NAME.trim()
  }
  const match = tomlContent.match(/^\s*name\s*=\s*"([^"]+)"/m)
  return match ? match[1] : null
}

export function applyWorkerNameTemplate(content, workerName) {
  if (!workerName) return content
  let updated = content.replaceAll('{{WORKER_NAME}}', workerName)
  
  const existingNameMatch = updated.match(/^(\s*)name\s*=\s*"([^"]+)"/m)
  if (existingNameMatch && existingNameMatch[2] !== workerName) {
    updated = updated.replace(/^(\s*)name\s*=\s*"[^"]+"/m, `$1name = "${workerName}"`)
  }
  return updated
}

export function extractQueueNames(tomlContent) {
  const names = new Set()
  const pattern = /^\s*(?:queue|dead_letter_queue)\s*=\s*"([^"]+)"/gm
  let match
  while ((match = pattern.exec(tomlContent)) !== null) {
    if (!match[1].includes('{{WORKER_NAME}}')) {
      names.add(match[1])
    }
  }
  return [...names]
}

export function isValidQueueName(name) {
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(name)
}

function runWranglerQueuesCreate(name) {
  return spawnSync(`npx wrangler queues create ${name}`, {
    encoding: 'utf8',
    shell: true,
  })
}

function runWranglerQueuesInfo(name) {
  return spawnSync(`npx wrangler queues info ${name}`, {
    encoding: 'utf8',
    shell: true,
  })
}

/** Nomes de Worker na linha `Consumers: worker:a, worker:b` de `wrangler queues info`. */
export function parseQueueConsumers(infoOutput) {
  const match = infoOutput.match(/^Consumers:\s*(.+)$/m)
  if (!match) return []
  return match[1]
    .split(',')
    .map((s) => s.trim().replace(/^worker:/, ''))
    .filter(Boolean)
}

export function isQueueNotFound(output) {
  return /does not exist/i.test(output)
}

export function isMissingCloudflareAuth(output) {
  return /not (?:logged in|authenticated)|authentication error|CLOUDFLARE_API_TOKEN|wrangler login|\[code: 10000\]/i.test(output)
}

export function isAlreadyExists(output) {
  return /already exists|already in use|already taken/i.test(output)
}

function main() {
  const rawToml = readFileSync(wranglerTomlPath, 'utf8')
  const workerName = resolveWorkerName(rawToml)
  let toml = applyWorkerNameTemplate(rawToml, workerName)

  if (workerName) {
    console.log(`[ensure-cf-queues] Worker name resolvido: "${workerName}"`)
  }

  // Suporte a Workers for Platforms: remove [triggers] se desativado por flag de ambiente
  if (process.env.DISABLE_CRON_TRIGGERS === 'true' || process.env.WORKERS_FOR_PLATFORMS === 'true') {
    console.log('[ensure-cf-queues] Desativando Cron Triggers para compatibilidade com Workers for Platforms.')
    toml = toml.replace(/\[triggers\][\s\S]*?(?=\n\[|$)/g, '')
  }

  // `wrangler.toml` NUNCA é reescrito em disco — `toml` (a versão resolvida)
  // só existe em memória, usada abaixo para sincronizar `.output/server/wrangler.json`
  // e para extrair os nomes de fila. O arquivo commitado continua com
  // `{{WORKER_NAME}}` intacto sempre, em qualquer ambiente.

  // Atualiza .output/server/wrangler.json se existir (gerado pelo Nitro no build)
  if (existsSync(nitroWranglerJsonPath)) {
    try {
      let jsonStr = readFileSync(nitroWranglerJsonPath, 'utf8')
      let modified = false
      if (jsonStr.includes('{{WORKER_NAME}}')) {
        jsonStr = jsonStr.replaceAll('{{WORKER_NAME}}', workerName)
        modified = true
      }
      try {
        const jsonObj = JSON.parse(jsonStr)
        if (workerName && jsonObj.name !== workerName) {
          jsonObj.name = workerName
          jsonStr = JSON.stringify(jsonObj, null, 2)
          modified = true
        }
      } catch {
        // Ignora erro de parse se o JSON contiver formatação customizada
      }

      if (modified) {
        writeFileSync(nitroWranglerJsonPath, jsonStr, 'utf8')
        console.log('[ensure-cf-queues] .output/server/wrangler.json sincronizado com o nome do Worker.')
      }
    } catch (err) {
      console.warn('[ensure-cf-queues] Aviso: não foi possível atualizar .output/server/wrangler.json:', err.message)
    }
  }

  // Extrair e criar filas no Cloudflare
  const queueNames = extractQueueNames(toml)

  if (queueNames.length === 0) {
    console.log('[ensure-cf-queues] Nenhuma fila declarada — nada a fazer.')
    return
  }

  console.log(`[ensure-cf-queues] Verificando ${queueNames.length} fila(s): ${queueNames.join(', ')}`)

  const invalido = queueNames.find((name) => !isValidQueueName(name))
  if (invalido) {
    console.error(`[ensure-cf-queues] ✘ nome de fila inválido: "${invalido}".`)
    process.exit(1)
  }

  // Checagem de posse: uma fila que já existe com consumer de OUTRO Worker
  // não pode ser reusada — implantar por cima roubaria o binding em silêncio
  // (§8.1 de _docs/em-andamento.md). Roda antes de qualquer `create`, para
  // falhar cedo e sem efeito colateral.
  for (const name of queueNames) {
    const result = runWranglerQueuesInfo(name)
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`

    if (result.status === 0) {
      const donos = parseQueueConsumers(output)
      const estranho = donos.find((dono) => dono !== workerName)
      if (estranho) {
        console.error(`[ensure-cf-queues] ✘ COLISÃO: a fila "${name}" já tem o Worker "${estranho}" como consumer — este deploy é "${workerName}".`)
        console.error(`[ensure-cf-queues]   Prosseguir roubaria o binding de consumer de "${estranho}" e pararia as mensagens dele em silêncio — foi exatamente isso que já derrubou o WhatsApp uma vez (§8.1 de _docs/em-andamento.md).`)
        console.error(`[ensure-cf-queues]   Defina CLOUDFLARE_WORKER_NAME (Workers Builds → Variáveis e segredos) com um nome que ainda não tenha filas nesta conta Cloudflare.`)
        process.exit(1)
      }
      continue
    }

    if (isQueueNotFound(output)) {
      continue // fila ainda não existe — segue para o loop de criação abaixo
    }

    if (isMissingCloudflareAuth(output)) {
      console.warn(`[ensure-cf-queues] ⚠ sem credencial da Cloudflare — pulando a checagem de posse das filas.`)
      return
    }

    console.error(`[ensure-cf-queues] ✘ falha ao consultar a fila "${name}":`)
    console.error(output || `(processo saiu com código ${result.status}, sem saída)`)
    process.exit(1)
  }

  for (const name of queueNames) {
    const result = runWranglerQueuesCreate(name)
    const output = `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `\n${result.error.message}` : ''}`

    if (result.status === 0) {
      console.log(`[ensure-cf-queues] ✓ criada: ${name}`)
      continue
    }

    if (isAlreadyExists(output)) {
      console.log(`[ensure-cf-queues] ✓ já existe: ${name}`)
      continue
    }

    if (isMissingCloudflareAuth(output)) {
      console.warn(`[ensure-cf-queues] ⚠ sem credencial da Cloudflare — pulando a criação das filas.`)
      return
    }

    console.error(`[ensure-cf-queues] ✘ falha ao garantir a fila "${name}":`)
    console.error(output || `(processo saiu com código ${result.status}, sem saída)`)
    process.exit(1)
  }

  console.log('[ensure-cf-queues] Todas as filas confirmadas.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
}
