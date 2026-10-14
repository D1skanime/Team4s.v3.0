import { ApiError } from '@/lib/api'
import type { MeProjectReleaseVersion } from '@/types/contributions'

export function parsePositiveInt(value: string | string[] | undefined): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return fallback
}

export function formatEpisodeNumber(value?: number | null): string {
  if (value == null) return 'Episode'
  return `Episode ${String(value).padStart(2, '0')}`
}

export function formatEpisodeLabel(value?: number | null, title?: string | null): string {
  return title?.trim() || formatEpisodeNumber(value)
}

export function getProjectReturnPath(raw: string | null, animeId: number, fansubGroupId?: number | null): string | null {
  if (!raw || !fansubGroupId) return null
  const expected = `/me/projects/${animeId}/group/${fansubGroupId}`
  return raw === expected ? raw : null
}

export function formatAdjacentReleaseLabel(release: MeProjectReleaseVersion): string {
  return release.episode_title?.trim() || release.title?.trim() || `Episode ${release.episode_number}`
}

export function parseWorkspaceTab(value: string | null): WorkspaceTab | null {
  return value === 'metadata' || value === 'media' || value === 'segments' || value === 'notes'
    ? value
    : null
}

export function buildWorkspaceHref(releaseVersionId: number, projectReturnHref: string | null): string {
  const path = `/me/releases/${releaseVersionId}/workspace`
  if (!projectReturnHref) return path
  const query = new URLSearchParams({ return_to: projectReturnHref })
  return `${path}?${query.toString()}`
}

export type WorkspaceTab = 'metadata' | 'media' | 'segments' | 'notes'

export type AdjacentReleases = { previous: MeProjectReleaseVersion | null; next: MeProjectReleaseVersion | null }

export type NavigationState = {
  key: string
  status: 'ready' | 'error'
  adjacent: AdjacentReleases | null
}
