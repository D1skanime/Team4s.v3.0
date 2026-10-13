import { ApiError } from '@/lib/api'

/**
 * Ported verbatim from EpisodeVersionEditorPage.tsx:71-93 -- the permissive 2-pattern variant,
 * used to validate an arbitrary `return_to` value before using it as a redirect-after-save target.
 * D-01/D-03: accepts both the admin-fansub-workspace pattern and the member-project-workspace
 * pattern (T-181-04: strict allowlist regex, rejects protocol-relative/absolute-URL/backslash
 * smuggling via the `new URL(trimmed, 'http://team4s.local')` origin check).
 */
export function getSafeReturnPath(value: string | null): string | null {
  const trimmed = value?.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return null
  if (trimmed.includes('\\') || trimmed.includes('://')) return null

  try {
    const parsed = new URL(trimmed, 'http://team4s.local')
    if (parsed.origin !== 'http://team4s.local') return null

    const isAdminFansubWorkspace = /^\/admin\/fansubs\/\d+\/edit$/.test(parsed.pathname)
    const isMemberProjectWorkspace = /^\/me\/projects\/\d+\/group\/\d+$/.test(parsed.pathname)
    if (!isAdminFansubWorkspace && !isMemberProjectWorkspace) return null

    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return null
  }
}

/**
 * Ported verbatim from workspaceHelpers.ts -- the strict exact-match variant, used only to build
 * the "Zurück zum Projekt" href when the context is already known to be project-scoped.
 */
export function getProjectReturnPath(
  raw: string | null,
  animeId: number,
  fansubGroupId?: number | null,
): string | null {
  if (!raw || !fansubGroupId) return null
  const expected = `/me/projects/${animeId}/group/${fansubGroupId}`
  return raw === expected ? raw : null
}

/**
 * Ported from workspaceHelpers.ts -- the more general `string | string[] | undefined` variant
 * (handles Next.js route params that may arrive as an array).
 */
export function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

/** Ported verbatim from workspaceHelpers.ts. */
export function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

/** Ported verbatim from workspaceHelpers.ts. */
export function formatEpisodeNumber(value?: number | null): string {
  if (value == null) return 'Episode'
  return `Episode ${String(value).padStart(2, '0')}`
}

/** Ported verbatim from workspaceHelpers.ts. */
export function formatEpisodeLabel(value?: number | null, title?: string | null): string {
  return title?.trim() || formatEpisodeNumber(value)
}

/**
 * D-03: resolves which Vor/Zurück navigation data source the merged release editor page should
 * use, derived purely from the entry context (no visible toggle for the user). New logic -- both
 * existing regexes above feed into it.
 */
export type NavigationContext = 'project' | 'episode'

export function resolveNavigationContext(params: {
  returnTo: string | null
  animeIdQuery: number | null
  episodeIdQuery: number | null
}): NavigationContext {
  if (params.returnTo && /^\/me\/projects\/\d+\/group\/\d+$/.test(params.returnTo)) return 'project'
  if (params.returnTo && /^\/admin\/fansubs\/\d+\/edit$/.test(params.returnTo)) return 'episode'
  if (params.animeIdQuery != null && params.episodeIdQuery != null) return 'episode'
  return 'project' // konservativer Fallback, RESEARCH.md Assumption A1
}
