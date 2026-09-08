import { describe, expect, it } from 'vitest'
import { LAB_QUEUE_SUFFIX, MEDIA_QUEUE_SUFFIX, TURN_QUEUE_SUFFIX, isBatchForQueue } from './queueBindings'

/**
 * Regressão do apagão da §8.1 de `_docs/em-andamento.md`: o consumer comparava
 * `batch.queue` contra a constante `'whatsapp-turno-check'`, mas a fila real
 * passou a se chamar `<worker>-turno-check`. A comparação virou sempre falsa e
 * TODO lote foi descartado em silêncio — o agente ficou mudo sem log.
 *
 * O que estes casos travam é o nome **com prefixo**, que é o de produção. Os
 * specs antigos usavam a mesma constante sem prefixo que o código: concordavam
 * entre si e não viam o defeito.
 */
describe('isBatchForQueue', () => {
  it('reconhece a fila de turno com o prefixo do Worker', () => {
    expect(isBatchForQueue('pedped-turno-check', TURN_QUEUE_SUFFIX)).toBe(true)
    expect(isBatchForQueue('farmacias-turno-check', TURN_QUEUE_SUFFIX)).toBe(true)
  })

  it('reconhece a fila de mídia com o prefixo do Worker', () => {
    expect(isBatchForQueue('pedped-midia', MEDIA_QUEUE_SUFFIX)).toBe(true)
  })

  it('não confunde as duas filas do mesmo Worker — é este o trabalho da função', () => {
    expect(isBatchForQueue('pedped-midia', TURN_QUEUE_SUFFIX)).toBe(false)
    expect(isBatchForQueue('pedped-turno-check', MEDIA_QUEUE_SUFFIX)).toBe(false)
  })

  it('ignora a DLQ — ela não tem consumer (§8.1 da arquitetura de mídia)', () => {
    expect(isBatchForQueue('pedped-turno-check-dlq', TURN_QUEUE_SUFFIX)).toBe(false)
    expect(isBatchForQueue('pedped-midia-dlq', MEDIA_QUEUE_SUFFIX)).toBe(false)
  })

  it('exige o hífen antes do sufixo', () => {
    expect(isBatchForQueue('lojamidia', MEDIA_QUEUE_SUFFIX)).toBe(false)
    expect(isBatchForQueue('midia', MEDIA_QUEUE_SUFFIX)).toBe(false)
  })

  it('os sufixos não carregam prefixo — constante com nome completo já causou o apagão', () => {
    expect(TURN_QUEUE_SUFFIX).toBe('turno-check')
    expect(MEDIA_QUEUE_SUFFIX).toBe('midia')
  })

  it('reconhece a fila do laboratório sem confundir com as outras duas', () => {
    expect(isBatchForQueue('pedped-lab', LAB_QUEUE_SUFFIX)).toBe(true)
    expect(isBatchForQueue('pedped-lab-dlq', LAB_QUEUE_SUFFIX)).toBe(false)
    expect(isBatchForQueue('pedped-lab', TURN_QUEUE_SUFFIX)).toBe(false)
    expect(isBatchForQueue('pedped-turno-check', LAB_QUEUE_SUFFIX)).toBe(false)
  })
})
