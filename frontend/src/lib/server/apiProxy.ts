const DEFAULT_INTERNAL_API_URL = 'http://team4sv30-backend:8092'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'content-length',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
])

type ApiProxyEnv = Record<string, string | undefined>

function normalizeApiBaseUrl(raw: string): string {
  const value = raw.trim()
  if (!value) return ''

  try {
    const parsed = new URL(value)
    if (parsed.hostname === 'backend') {
      parsed.hostname = 'team4sv30-backend'
      return parsed.toString().replace(/\/$/, '')
    }
    return value.replace(/\/$/, '')
  } catch {
    return value.replace(/\/$/, '')
  }
}

export function getInternalApiBaseUrl(env: ApiProxyEnv = process.env): string {
  return normalizeApiBaseUrl(env.API_INTERNAL_URL || '') || normalizeApiBaseUrl(env.NEXT_PUBLIC_API_URL || '') || DEFAULT_INTERNAL_API_URL
}

export function buildApiProxyTarget(pathSegments: string[], requestUrl: string, env: ApiProxyEnv = process.env): string {
  const request = new URL(requestUrl)
  const path = pathSegments.map((segment) => encodeURIComponent(segment)).join('/')
  const target = new URL(`/api/v1/${path}`, `${getInternalApiBaseUrl(env)}/`)
  target.search = request.search
  return target.toString()
}

export function copyProxyRequestHeaders(source: Headers): Headers {
  const headers = new Headers()
  source.forEach((value, key) => {
    const normalizedKey = key.toLowerCase()
    if (normalizedKey === 'host' || HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return
    }
    headers.set(key, value)
  })
  return headers
}

export function copyProxyResponseHeaders(source: Headers): Headers {
  const headers = new Headers()
  source.forEach((value, key) => {
    const normalizedKey = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(normalizedKey)) {
      return
    }
    headers.set(key, value)
  })
  return headers
}

export async function proxyBackendApiRequest(request: Request, pathSegments: string[]): Promise<Response> {
  const target = buildApiProxyTarget(pathSegments, request.url)
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  const init: RequestInit & { duplex?: 'half' } = {
    method: request.method,
    headers: copyProxyRequestHeaders(request.headers),
    cache: 'no-store',
    redirect: 'manual',
  }

  if (hasBody && request.body) {
    init.body = request.body
    init.duplex = 'half'
  }

  let upstream: Response
  try {
    upstream = await fetch(target, init)
  } catch {
    return Response.json({ error: { message: 'Backend API nicht erreichbar.' } }, { status: 502 })
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: copyProxyResponseHeaders(upstream.headers),
  })
}
