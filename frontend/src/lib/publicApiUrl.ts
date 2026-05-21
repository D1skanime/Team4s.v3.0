const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '::1', '[::1]'])

type QueryValue = string | number | boolean | null | undefined

function trimTrailingSlash(value: string): string {
  return value.replace(/\/$/, '')
}

export function getBrowserApiBaseUrl(raw = process.env.NEXT_PUBLIC_API_URL || ''): string {
  const value = trimTrailingSlash(raw.trim())
  if (!value) {
    return ''
  }

  try {
    const parsed = new URL(value)
    if (LOOPBACK_HOSTS.has(parsed.hostname)) {
      return ''
    }
  } catch {
    return value
  }

  return value
}

export function resolvePublicApiUrl(value?: string | null, query?: Record<string, QueryValue>): string {
  const trimmed = (value || '').trim()
  if (!trimmed) {
    return ''
  }

  const base = getBrowserApiBaseUrl()
  const url = new URL(trimmed, base ? `${base}/` : 'http://team4s.local')

  if (query) {
    for (const [key, queryValue] of Object.entries(query)) {
      if (queryValue === null || typeof queryValue === 'undefined') {
        continue
      }
      url.searchParams.set(key, String(queryValue))
    }
  }

  if (base || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return url.toString()
  }

  return `${url.pathname}${url.search}${url.hash}`
}
