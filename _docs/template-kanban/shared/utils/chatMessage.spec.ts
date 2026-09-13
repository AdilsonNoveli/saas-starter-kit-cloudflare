import { describe, it, expect } from 'vitest'
import { parseChatMessageContent, deriveChatMessageAuthorship, parseChatMessage } from './chatMessage'

describe('parseChatMessageContent', () => {
  it('devolve texto puro sem prefixo', () => {
    expect(parseChatMessageContent('quero duas cocas')).toEqual({
      prefixType: 'text',
      displayText: 'quero duas cocas',
    })
  })

  it('decodifica áudio transcrito', () => {
    expect(parseChatMessageContent('[áudio transcrito] quero duas cocas')).toEqual({
      prefixType: 'audio_transcript',
      displayText: 'quero duas cocas',
    })
  })

  it('decodifica imagem sem legenda', () => {
    expect(parseChatMessageContent('[imagem: Uma garrafa de Coca-Cola 2 L.]')).toEqual({
      prefixType: 'image_description',
      displayText: 'Uma garrafa de Coca-Cola 2 L.',
    })
  })

  it('decodifica imagem COM legenda numa segunda linha, sem deixar "]" sobrando', () => {
    const result = parseChatMessageContent('[imagem: duas garrafas de coca 2L]\nquantos desses?')
    expect(result.prefixType).toBe('image_description')
    expect(result.displayText).toBe('duas garrafas de coca 2L\nquantos desses?')
    expect(result.displayText).not.toContain(']')
  })

  it('decodifica resposta humana', () => {
    expect(parseChatMessageContent('[loja respondeu manualmente] oi, tudo bem?')).toEqual({
      prefixType: 'human_reply',
      displayText: 'oi, tudo bem?',
    })
  })
})

describe('deriveChatMessageAuthorship', () => {
  it('usa ator quando presente — humano_painel', () => {
    expect(deriveChatMessageAuthorship({ role: 'assistant', actor: 'humano_painel', prefixType: 'human_reply' }))
      .toEqual({ isFromStaff: true, isFromAgent: false })
  })

  it('usa ator quando presente — humano_celular', () => {
    expect(deriveChatMessageAuthorship({ role: 'assistant', actor: 'humano_celular', prefixType: 'human_reply' }))
      .toEqual({ isFromStaff: true, isFromAgent: false })
  })

  it('usa ator quando presente — agente_ia', () => {
    expect(deriveChatMessageAuthorship({ role: 'assistant', actor: 'agente_ia', prefixType: 'text' }))
      .toEqual({ isFromStaff: false, isFromAgent: true })
  })

  it('usa ator quando presente — cliente', () => {
    expect(deriveChatMessageAuthorship({ role: 'user', actor: 'cliente', prefixType: 'text' }))
      .toEqual({ isFromStaff: false, isFromAgent: false })
  })

  it('cai na heurística de prefixo quando ator está ausente (linha legada) — resposta humana', () => {
    expect(deriveChatMessageAuthorship({ role: 'assistant', prefixType: 'human_reply' }))
      .toEqual({ isFromStaff: true, isFromAgent: false })
  })

  it('cai na heurística de prefixo quando ator está ausente — agente', () => {
    expect(deriveChatMessageAuthorship({ role: 'assistant', prefixType: 'text' }))
      .toEqual({ isFromStaff: false, isFromAgent: true })
  })

  it('cai na heurística de prefixo quando ator está ausente — cliente', () => {
    expect(deriveChatMessageAuthorship({ role: 'user', prefixType: 'text' }))
      .toEqual({ isFromStaff: false, isFromAgent: false })
  })
})

describe('parseChatMessage', () => {
  it('combina conteúdo e autoria', () => {
    const result = parseChatMessage({
      role: 'assistant',
      content: '[loja respondeu manualmente] já te atendo',
      actor: 'humano_painel',
    })
    expect(result).toEqual({
      prefixType: 'human_reply',
      displayText: 'já te atendo',
      isFromStaff: true,
      isFromAgent: false,
    })
  })
})
