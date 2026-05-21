import { resolvePublicApiUrl } from '@/lib/publicApiUrl'

export function resolveJellyfinIntakeAssetUrl(rawUrl?: string): string {
  const value = (rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  if (value.startsWith('/')) {
    return resolvePublicApiUrl(value)
  }
  return value
}
