function resolveApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_URL || '').trim() || 'http://localhost:8092'
}

export function resolveJellyfinIntakeAssetUrl(rawUrl?: string): string {
  const value = (rawUrl || '').trim()
  if (!value) return ''
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value
  }
  if (value.startsWith('/')) {
    return `${resolveApiBaseUrl()}${value}`
  }
  return value
}
