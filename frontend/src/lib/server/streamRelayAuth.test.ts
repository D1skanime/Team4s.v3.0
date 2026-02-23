import { describe, expect, it } from 'vitest'

import { resolveStreamRelayTarget } from './streamRelayAuth'

describe('resolveStreamRelayTarget', () => {
  it('uses a provided grant token directly', async () => {
    const result = await resolveStreamRelayTarget({
      apiBaseURL: 'http://localhost:8092',
      streamPath: '/api/v1/releases/38/stream',
      grantPath: '/api/v1/releases/38/grant',
      providedGrant: 'abc-123',
      accessToken: 'token-old',
      refreshToken: 'refresh-old',
      fetchImpl: async () => {
        throw new Error('no fetch expected when grant is provided')
      },
    })

    expect(result.targetURL).toBe('http://localhost:8092/api/v1/releases/38/stream?grant=abc-123')
    expect(result.authorizationToken).toBe('')
    expect(result.refreshedSession).toBeNull()
  })

  it('refreshes access token when grant call returns 401 and retries grant', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
      calls.push({ url: input, init })
      if (input.endsWith('/api/v1/releases/38/grant') && calls.length === 1) {
        return new Response(JSON.stringify({ error: { message: 'ungueltiges zugriffstoken' } }), { status: 401 })
      }
      if (input.endsWith('/api/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({
            data: {
              access_token: 'token-new',
              access_token_expires_in: 900,
              refresh_token: 'refresh-new',
              refresh_token_expires_in: 604800,
              display_name: 'Nico',
            },
          }),
          { status: 200 },
        )
      }
      if (input.endsWith('/api/v1/releases/38/grant') && calls.length === 3) {
        return new Response(JSON.stringify({ data: { grant_token: 'grant-new' } }), { status: 201 })
      }
      throw new Error(`unexpected fetch call: ${input}`)
    }

    const result = await resolveStreamRelayTarget({
      apiBaseURL: 'http://localhost:8092',
      streamPath: '/api/v1/releases/38/stream',
      grantPath: '/api/v1/releases/38/grant',
      providedGrant: '',
      accessToken: 'token-old',
      refreshToken: 'refresh-old',
      fetchImpl,
    })

    expect(result.targetURL).toBe('http://localhost:8092/api/v1/releases/38/stream?grant=grant-new')
    expect(result.authorizationToken).toBe('')
    expect(result.refreshedSession).not.toBeNull()
    expect(result.refreshedSession?.accessToken).toBe('token-new')
    expect(result.refreshedSession?.refreshToken).toBe('refresh-new')
  })

  it('falls back to bearer stream call when grant endpoint is unavailable', async () => {
    const fetchImpl = async (input: string): Promise<Response> => {
      if (input.endsWith('/api/v1/episodes/76/play/grant')) {
        return new Response(JSON.stringify({ error: { message: 'interner serverfehler' } }), { status: 500 })
      }
      throw new Error(`unexpected fetch call: ${input}`)
    }

    const result = await resolveStreamRelayTarget({
      apiBaseURL: 'http://localhost:8092',
      streamPath: '/api/v1/episodes/76/play',
      grantPath: '/api/v1/episodes/76/play/grant',
      providedGrant: '',
      accessToken: 'token-active',
      refreshToken: '',
      fetchImpl,
    })

    expect(result.targetURL).toBe('http://localhost:8092/api/v1/episodes/76/play')
    expect(result.authorizationToken).toBe('token-active')
    expect(result.refreshedSession).toBeNull()
  })

  it('refreshes session before bearer fallback when access token is empty', async () => {
    const calls: string[] = []
    const fetchImpl = async (input: string): Promise<Response> => {
      calls.push(input)
      if (input.endsWith('/api/v1/auth/refresh')) {
        return new Response(
          JSON.stringify({
            data: {
              access_token: 'token-refreshed',
              access_token_expires_in: 900,
              refresh_token: 'refresh-rotated',
              refresh_token_expires_in: 604800,
              display_name: 'Nico',
            },
          }),
          { status: 200 },
        )
      }
      if (input.endsWith('/api/v1/episodes/76/play/grant')) {
        return new Response(JSON.stringify({ error: { message: 'stream grant voruebergehend nicht verfuegbar' } }), {
          status: 503,
        })
      }
      throw new Error(`unexpected fetch call: ${input}`)
    }

    const result = await resolveStreamRelayTarget({
      apiBaseURL: 'http://localhost:8092',
      streamPath: '/api/v1/episodes/76/play',
      grantPath: '/api/v1/episodes/76/play/grant',
      providedGrant: '',
      accessToken: '',
      fallbackAccessToken: '',
      refreshToken: 'refresh-old',
      fetchImpl,
    })

    expect(calls).toEqual([
      'http://localhost:8092/api/v1/auth/refresh',
      'http://localhost:8092/api/v1/episodes/76/play/grant',
    ])
    expect(result.targetURL).toBe('http://localhost:8092/api/v1/episodes/76/play')
    expect(result.authorizationToken).toBe('token-refreshed')
    expect(result.refreshedSession?.refreshToken).toBe('refresh-rotated')
  })

  it('retries grant with fallback access token when cookie token is invalid', async () => {
    const authHeaders: string[] = []
    const fetchImpl = async (input: string, init?: RequestInit): Promise<Response> => {
      if (input.endsWith('/api/v1/releases/38/grant')) {
        const rawHeader = (init?.headers as Headers | undefined)?.get('Authorization') || ''
        authHeaders.push(rawHeader)
        if (rawHeader === 'Bearer token-cookie-invalid') {
          return new Response(JSON.stringify({ error: { message: 'ungueltiges zugriffstoken' } }), { status: 401 })
        }
        if (rawHeader === 'Bearer token-env-fallback') {
          return new Response(JSON.stringify({ data: { grant_token: 'grant-from-fallback' } }), { status: 201 })
        }
      }
      throw new Error(`unexpected fetch call: ${input}`)
    }

    const result = await resolveStreamRelayTarget({
      apiBaseURL: 'http://localhost:8092',
      streamPath: '/api/v1/releases/38/stream',
      grantPath: '/api/v1/releases/38/grant',
      providedGrant: '',
      accessToken: 'token-cookie-invalid',
      fallbackAccessToken: 'token-env-fallback',
      refreshToken: '',
      fetchImpl,
    })

    expect(authHeaders).toEqual(['Bearer token-cookie-invalid', 'Bearer token-env-fallback'])
    expect(result.targetURL).toBe('http://localhost:8092/api/v1/releases/38/stream?grant=grant-from-fallback')
    expect(result.authorizationToken).toBe('')
    expect(result.refreshedSession).toBeNull()
  })
})
