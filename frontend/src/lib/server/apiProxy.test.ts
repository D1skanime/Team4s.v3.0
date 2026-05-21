import { describe, expect, it } from 'vitest'

import {
  buildApiProxyTarget,
  copyProxyRequestHeaders,
  copyProxyResponseHeaders,
  getInternalApiBaseUrl,
} from './apiProxy'

describe('apiProxy', () => {
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
})
