import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  buildApiProxyTarget,
  copyProxyRequestHeaders,
  copyProxyResponseHeaders,
  getInternalApiBaseUrl,
  proxyBackendApiRequest,
  shouldBufferProxyRequestBody,
} from './apiProxy'

describe('apiProxy', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses the Docker-internal backend URL for same-origin API proxy requests', () => {
    expect(getInternalApiBaseUrl({
      API_INTERNAL_URL: 'http://team4sv30-backend:8092',
      NEXT_PUBLIC_API_URL: 'http://127.0.0.1:8092',
    })).toBe('http://team4sv30-backend:8092')
  })

  it('normalizes the legacy backend compose hostname', () => {
    expect(getInternalApiBaseUrl({
      API_INTERNAL_URL: 'http://backend:8092/',
      NEXT_PUBLIC_API_URL: '',
    })).toBe('http://team4sv30-backend:8092')
  })

  it('preserves path segments and query strings when targeting the backend', () => {
    expect(buildApiProxyTarget(
      ['admin', 'fansubs', '88', 'anime'],
      'http://127.0.0.1:3002/api/v1/admin/fansubs/88/anime?include=notes',
      {
        API_INTERNAL_URL: 'http://team4sv30-backend:8092',
        NEXT_PUBLIC_API_URL: '',
      },
    )).toBe('http://team4sv30-backend:8092/api/v1/admin/fansubs/88/anime?include=notes')
  })

  it('forwards auth headers without hop-by-hop request headers', () => {
    const headers = copyProxyRequestHeaders(new Headers({
      Authorization: 'Bearer central-token',
      Connection: 'keep-alive',
      Host: '127.0.0.1:3002',
    }))

    expect(headers.get('Authorization')).toBe('Bearer central-token')
    expect(headers.has('Connection')).toBe(false)
    expect(headers.has('Host')).toBe(false)
  })

  it('keeps response headers useful but drops hop-by-hop headers', () => {
    const headers = copyProxyResponseHeaders(new Headers({
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
    }))

    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.has('Transfer-Encoding')).toBe(false)
  })

  it('buffers multipart upload bodies before forwarding to the backend', async () => {
    const form = new FormData()
    form.set('theme_id', '1')
    form.set('file', new Blob(['probe'], { type: 'text/plain' }), 'probe.txt')
    const request = new Request('http://127.0.0.1:3000/api/v1/admin/releases/1/theme-assets', {
      method: 'POST',
      body: form,
    })
    let forwardedInit: RequestInit | undefined
    vi.stubGlobal('fetch', vi.fn(async (_target: string, init: RequestInit) => {
      forwardedInit = init
      return Response.json({ data: true }, { status: 201 })
    }))

    expect(shouldBufferProxyRequestBody(request.clone())).toBe(true)
    const response = await proxyBackendApiRequest(request, ['admin', 'releases', '1', 'theme-assets'])

    expect(response.status).toBe(201)
    expect(forwardedInit?.body).toBeInstanceOf(ArrayBuffer)
    expect('duplex' in (forwardedInit || {})).toBe(false)
  })
})
