import { describe, expect, it } from 'vitest'
import {
  decideInboundMedia,
  mediaKindOf,
  MEDIA_DISABLED_TEXT,
  UNSUPPORTED_TYPE_TEXT,
} from './inboundMediaPolicy'
import type { ParsedInboundMedia } from './parseInboundPayload'

const midia: ParsedInboundMedia = {
  mediaId: '2112121579740403',
  mimeType: 'audio/ogg; codecs=opus',
  url: null,
  caption: null,
  filename: null,
}

const tudoLigado = { audioHabilitado: true, imagemHabilitado: true }

describe('mediaKindOf', () => {
  it('reconhece áudio, imagem e documento (migration 114 — arte de produto) — o resto está fora de escopo (§0)', () => {
    expect(mediaKindOf('audio')).toBe('audio')
    expect(mediaKindOf('image')).toBe('image')
    expect(mediaKindOf('document')).toBe('document')
    for (const tipo of ['video', 'sticker', 'location', 'contacts', 'text']) {
      expect(mediaKindOf(tipo)).toBeNull()
    }
  })
})

describe('decideInboundMedia', () => {
  it('texto segue para o buffer de rajada', () => {
    expect(decideInboundMedia({ tipo: 'text', texto: 'quero uma coca', midia: null, flags: tudoLigado }))
      .toEqual({ acao: 'texto', texto: 'quero uma coca' })
  })

  it('texto só de espaços não vira turno — cai na recusa de tipo, com resposta', () => {
    const decisao = decideInboundMedia({ tipo: 'text', texto: '   ', midia: null, flags: tudoLigado })
    expect(decisao).toEqual({ acao: 'recusar', motivo: 'tipo_nao_suportado', mensagem: UNSUPPORTED_TYPE_TEXT })
  })

  it('áudio com o recurso ligado vai para a fila de mídia', () => {
    expect(decideInboundMedia({ tipo: 'audio', texto: null, midia, flags: tudoLigado }))
      .toEqual({ acao: 'processar', kind: 'audio', midia })
  })

  it('imagem com o recurso ligado vai para a fila de mídia', () => {
    expect(decideInboundMedia({ tipo: 'image', texto: null, midia, flags: tudoLigado }))
      .toEqual({ acao: 'processar', kind: 'image', midia })
  })

  it('áudio com o recurso desligado é recusado com a mensagem da §7.4', () => {
    const decisao = decideInboundMedia({
      tipo: 'audio',
      texto: null,
      midia,
      flags: { audioHabilitado: false, imagemHabilitado: true },
    })

    expect(decisao).toEqual({
      acao: 'recusar',
      motivo: 'recurso_desligado',
      kind: 'audio',
      midia,
      mensagem: MEDIA_DISABLED_TEXT.audio,
    })
  })

  it('imagem com o recurso desligado é recusada com a mensagem da §7.4', () => {
    const decisao = decideInboundMedia({
      tipo: 'image',
      texto: null,
      midia,
      flags: { audioHabilitado: true, imagemHabilitado: false },
    })

    expect(decisao).toMatchObject({ motivo: 'recurso_desligado', kind: 'image', mensagem: MEDIA_DISABLED_TEXT.image })
  })

  it.each(['video', 'document', 'sticker', 'location', 'contacts'])('recusa educadamente o tipo %s', (tipo) => {
    expect(decideInboundMedia({ tipo, texto: null, midia: null, flags: tudoLigado }))
      .toEqual({ acao: 'recusar', motivo: 'tipo_nao_suportado', mensagem: UNSUPPORTED_TYPE_TEXT })
  })

  it('recusa áudio sem media_id — sem ele não há download nem linha em whatsapp_midia', () => {
    expect(decideInboundMedia({ tipo: 'audio', texto: null, midia: null, flags: tudoLigado }))
      .toEqual({ acao: 'recusar', motivo: 'tipo_nao_suportado', mensagem: UNSUPPORTED_TYPE_TEXT })
  })

  it('nunca devolve uma decisão sem desfecho — é a regra da §2 contra o descarte da §1.1', () => {
    const casos = [
      { tipo: 'text', texto: 'oi', midia: null },
      { tipo: 'audio', texto: null, midia },
      { tipo: 'image', texto: null, midia },
      { tipo: 'video', texto: null, midia: null },
      { tipo: 'desconhecido', texto: null, midia: null },
    ]

    for (const caso of casos) {
      const decisao = decideInboundMedia({ ...caso, flags: tudoLigado })
      expect(['texto', 'processar', 'recusar']).toContain(decisao.acao)
      if (decisao.acao === 'recusar') expect(decisao.mensagem.length).toBeGreaterThan(0)
    }
  })
})
