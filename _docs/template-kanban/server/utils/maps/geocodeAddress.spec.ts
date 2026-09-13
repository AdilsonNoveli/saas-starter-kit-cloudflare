import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

const mocks = vi.hoisted(() => ({
  fetchGeocode: vi.fn(),
}))

vi.mock('./google', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./google')>()),
  fetchGeocode: mocks.fetchGeocode,
}))

const { geocodeAddress } = await import('./geocodeAddress')

function buildSupabase(loja: Record<string, unknown> | null = null) {
  const supabase = {
    from: () => ({
      select: () => ({
        limit: () => ({
          maybeSingle: async () => ({ data: loja }),
        }),
      }),
    }),
    rpc: async () => ({ data: 0 }),
  } as unknown as SupabaseClient<Database>
  return supabase
}

describe('geocodeAddress', () => {
  it('repassa rua/numero do geocode — antes ficavam de fora mesmo fetchGeocode já os extraindo (bug em produção: agente sem como chamar AtualizarPedido)', async () => {
    mocks.fetchGeocode.mockResolvedValue({
      placeId: null,
      formattedAddress: 'Av. Paulista, 100 - Bela Vista, São Paulo - SP',
      lat: -23.5613,
      lng: -46.6558,
      rua: 'Avenida Paulista',
      numero: '100',
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01310-100',
    })

    const supabase = buildSupabase(null) // loja sem coordenadas configuradas — cai no fallback "raio não configurado"

    const resultado = await geocodeAddress('fake-key', supabase, 'Avenida Paulista, 100', 0)

    expect(resultado.rua).toBe('Avenida Paulista')
    expect(resultado.numero).toBe('100')
  })

  it('rua/numero ausentes no geocode (endereço genérico) devolvem null, não quebram', async () => {
    mocks.fetchGeocode.mockResolvedValue({
      placeId: null,
      formattedAddress: 'São Paulo, SP',
      lat: -23.5505,
      lng: -46.6333,
      rua: null,
      numero: null,
      bairro: null,
      cidade: 'São Paulo',
      uf: 'SP',
      cep: null,
    })

    const supabase = buildSupabase(null)
    const resultado = await geocodeAddress('fake-key', supabase, 'São Paulo', 0)

    expect(resultado.rua).toBeNull()
    expect(resultado.numero).toBeNull()
  })
})
