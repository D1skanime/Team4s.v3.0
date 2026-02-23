export function getCoverUrl(coverImage?: string): string {
  if (!coverImage) {
    return '/covers/placeholder.jpg'
  }

  return `/covers/${coverImage}`
}

export function toNumber(input: string | string[] | undefined, fallback: number): number {
  if (!input || Array.isArray(input)) {
    return fallback
  }

  const parsed = Number.parseInt(input, 10)
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}
