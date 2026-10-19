export function shouldRenderEnableAudioButton(
  showThemeVideo: boolean,
  activeThemeVideoUrl: string | null,
  isThemeVideoMuted: boolean,
): boolean {
  if (!showThemeVideo) return false
  if (!activeThemeVideoUrl) return false
  return isThemeVideoMuted
}

interface ClosestCapable {
  closest(selector: string): { getAttribute(name: string): string | null } | null
}

function isClosestCapable(value: unknown): value is ClosestCapable {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { closest?: unknown }).closest === 'function'
  )
}

export function resolvesToDifferentLocation(href: string, currentHref: string): boolean {
  try {
    const resolved = new URL(href, currentHref)
    const current = new URL(currentHref)
    return resolved.href !== current.href
  } catch {
    return false
  }
}

export function isNavigationLinkTarget(target: unknown, currentHref: string): boolean {
  if (!isClosestCapable(target)) return false

  const anchor = target.closest('a[href]')
  if (!anchor) return false

  const href = anchor.getAttribute('href')
  if (!href) return false
  if (href.startsWith('#')) return false
  if (anchor.getAttribute('target') === '_blank') return false

  return resolvesToDifferentLocation(href, currentHref)
}

export function isNavigationTriggerEvent(
  eventType: 'pointerdown' | 'keydown',
  target: unknown,
  key: string | undefined,
  currentHref: string,
): boolean {
  if (eventType === 'keydown' && key !== 'Enter') return false
  return isNavigationLinkTarget(target, currentHref)
}

export interface StoppableVideo {
  muted: boolean
  pause(): void
  removeAttribute(name: string): void
  load(): void
}

export function stopThemeVideoPlayback(video: StoppableVideo): void {
  video.muted = true
  video.pause()
  video.removeAttribute('src')
  video.load()
}
