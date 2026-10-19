export interface LocalImagePattern {
  pathname: string
  search: string
}

export interface RemoteImagePattern {
  protocol: 'http' | 'https'
  hostname: string
  port: string
  pathname: string
}

export const LOCAL_IMAGE_PATTERNS: LocalImagePattern[]
export const FIXED_REMOTE_IMAGE_URLS: string[]
export function configuredApiMediaPatterns(
  apiBaseURL: string | undefined,
): RemoteImagePattern[]
