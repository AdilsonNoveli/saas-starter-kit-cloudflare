import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  extractQueueNames,
  isAlreadyExists,
  isMissingCloudflareAuth,
  isValidQueueName,
  applyWorkerNameTemplate,
  resolveWorkerName,
  parseQueueConsumers,
  isQueueNotFound,
} from './ensure-cf-queues.mjs'

// `process.cwd()` e não `import.meta.url`: sob o ambiente `nuxt` do vitest a URL
// deste módulo não é `file:`, e `fileURLToPath` recusa.
const rawWranglerToml = readFileSync(resolve(process.cwd(), 'wrangler.toml'), 'utf8')
const workerName = resolveWorkerName(rawWranglerToml) || 'pedped'
const wranglerToml = applyWorkerNameTemplate(rawWranglerToml, workerName)

describe('main() nunca reescreve wrangler.toml em disco (item 5 da §8.18 de _docs/em-andamento.md)', () => {
  it('não chama writeFileSync com o caminho do wrangler.toml da raiz', () => {
    // Guard de regressão, não teste de comportamento: `main()` não é exportado
    // de propósito (faz I/O real e chama `wrangler queues create` via shell) —
    // mockar tudo isso só para testar "não grava" seria mais frágil que ler o
    // próprio código-fonte. Antes de 2026-08-03 esta chamada existia e
    // reescrevia o arquivo commitado com o nome do Worker já resolvido,
    // apagando o mecanismo de instalações separadas (Cloudflare Queues são
    // escopadas por CONTA — a instalação seguinte herdaria as filas da
    // anterior). Este guard falha se a chamada voltar.
    const source = readFileSync(resolve(process.cwd(), 'scripts/ensure-cf-queues.mjs'), 'utf8')
    expect(source).not.toMatch(/writeFileSync\(\s*wranglerTomlPath/)
  })

  it('ainda sincroniza .output/server/wrangler.json — não é para parar de fazer isso, só de tocar a raiz', () => {
    const source = readFileSync(resolve(process.cwd(), 'scripts/ensure-cf-queues.mjs'), 'utf8')
    expect(source).toMatch(/writeFileSync\(\s*nitroWranglerJsonPath/)
  })
})

describe('extractQueueNames', () => {
  it('lê produtor, consumer e DLQ do wrangler.toml real, sem duplicar', () => {
    // Este é o teste que garante a promessa do script: **declarar a fila no
    // `wrangler.toml` basta**. Uma fila nova que o extrator não enxergasse
    // quebraria o deploy com `Queue "..." does not exist` só na Cloudflare,
    // longe de qualquer portão local.
    const names = extractQueueNames(wranglerToml)

    expect(names).toEqual(expect.arrayContaining([
      'pedped-turno-check',
      'pedped-turno-check-dlq',
      'pedped-midia',
      'pedped-midia-dlq',
    ]))
    expect(new Set(names).size).toBe(names.length)
  })

  it('ignora linhas comentadas — bloco de exemplo não vira fila de verdade', () => {
    const toml = [
      '[[queues.producers]]',
      'queue = "ativa"',
      '# queue = "so-um-exemplo"',
      '#dead_letter_queue = "tambem-exemplo"',
    ].join('\n')

    expect(extractQueueNames(toml)).toEqual(['ativa'])
  })

  it('devolve lista vazia quando não há fila declarada', () => {
    expect(extractQueueNames('name = "pedped"\n')).toEqual([])
  })
})

describe('isValidQueueName', () => {
  it('aceita todas as filas declaradas hoje', () => {
    for (const name of extractQueueNames(wranglerToml)) {
      expect(isValidQueueName(name), name).toBe(true)
    }
  })

  it('recusa o que viraria injeção de shell — o comando vai concatenado', () => {
    // O nome é a única entrada variável do comando enviado ao shell. Se esta
    // guarda cair, um `wrangler.toml` adulterado executa comando arbitrário no
    // build.
    for (const nome of ['fila; rm -rf /', 'fila && whoami', 'fila$(id)', 'fila`id`', 'fila|cat', 'fila com espaco']) {
      expect(isValidQueueName(nome), nome).toBe(false)
    }
  })

  it('recusa nomes fora do formato da Cloudflare', () => {
    expect(isValidQueueName('Fila-Maiuscula')).toBe(false)
    expect(isValidQueueName('-comeca-com-hifen')).toBe(false)
    expect(isValidQueueName('termina-com-hifen-')).toBe(false)
    expect(isValidQueueName('')).toBe(false)
    expect(isValidQueueName('a'.repeat(64))).toBe(false)
    expect(isValidQueueName('a'.repeat(63))).toBe(true)
  })
})

describe('isAlreadyExists', () => {
  it('trata "já existe" como sucesso — o script é idempotente por contrato', () => {
    expect(isAlreadyExists('A queue with this name already exists')).toBe(true)
    expect(isAlreadyExists('name already in use')).toBe(true)
    expect(isAlreadyExists('workers.api.error.queue_name_taken: already taken')).toBe(true)
  })

  it('não engole erro de verdade', () => {
    expect(isAlreadyExists('invalid queue name')).toBe(false)
    expect(isAlreadyExists('rate limited')).toBe(false)
  })
})

describe('parseQueueConsumers', () => {
  it('lê um único consumer da saída real de `wrangler queues info`', () => {
    const output = [
      'Queue Name: pedped-turno-check',
      'Queue ID: 32bedfc904324872a3f468e26e5990d5',
      'Number of Producers: 1',
      'Producers: worker:pedped',
      'Number of Consumers: 1',
      'Consumers: worker:pedped',
    ].join('\n')

    expect(parseQueueConsumers(output)).toEqual(['pedped'])
  })

  it('lê múltiplos consumers separados por vírgula', () => {
    const output = 'Consumers: worker:pedped, worker:farmacias'
    expect(parseQueueConsumers(output)).toEqual(['pedped', 'farmacias'])
  })

  it('devolve lista vazia quando não há consumer (fila nova ou DLQ)', () => {
    const output = ['Queue Name: pedped-turno-check-dlq', 'Number of Consumers: 0'].join('\n')
    expect(parseQueueConsumers(output)).toEqual([])
  })
})

describe('isQueueNotFound', () => {
  it('reconhece a mensagem real de fila inexistente', () => {
    expect(isQueueNotFound('Queue "farmacias-turno-check" does not exist. To create it, run: wrangler queues create farmacias-turno-check')).toBe(true)
  })

  it('não confunde com outros erros — esses continuam quebrando o build', () => {
    expect(isQueueNotFound('rate limited [code: 10013]')).toBe(false)
    expect(isQueueNotFound('Authentication error [code: 10000]')).toBe(false)
  })
})

describe('colisão de consumer entre instalações (§8.1 de _docs/em-andamento.md)', () => {
  it('detecta um Worker estranho como consumer — é o cenário que já derrubou o WhatsApp uma vez', () => {
    const donos = parseQueueConsumers('Consumers: worker:farmacias')
    const estranho = donos.find((dono) => dono !== 'pedped')
    expect(estranho).toBe('farmacias')
  })

  it('não acusa colisão quando o consumer já é o próprio Worker sendo implantado (redeploy)', () => {
    const donos = parseQueueConsumers('Consumers: worker:pedped')
    const estranho = donos.find((dono) => dono !== 'pedped')
    expect(estranho).toBeUndefined()
  })
})

describe('isMissingCloudflareAuth', () => {
  it('reconhece as formas que o wrangler usa para "sem credencial"', () => {
    expect(isMissingCloudflareAuth('In a non-interactive environment, it\'s necessary to set a CLOUDFLARE_API_TOKEN')).toBe(true)
    expect(isMissingCloudflareAuth('Authentication error [code: 10000]')).toBe(true)
    expect(isMissingCloudflareAuth('You are not authenticated. Please run `wrangler login`.')).toBe(true)
  })

  it('não confunde falha real com falta de credencial — essa continua quebrando o build', () => {
    // Se isto passasse a devolver `true`, um erro real (nome inválido, rate
    // limit) viraria um "pulado" silencioso e a fila nunca seria criada.
    expect(isMissingCloudflareAuth('workers.api.error.invalid_queue_name')).toBe(false)
    expect(isMissingCloudflareAuth('rate limited [code: 10013]')).toBe(false)
  })
})
