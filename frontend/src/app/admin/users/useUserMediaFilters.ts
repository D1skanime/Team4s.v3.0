'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { AdminUserMediaParams } from '@/types/admin-users'

const DEFAULT_LIMIT = 25

export interface UseUserMediaFiltersResult {
  params: AdminUserMediaParams
  handleAnimeChange: (value: string) => void
  handleGroupChange: (value: string) => void
  handleReleaseOrEpisodeChange: (value: string) => void
  handleMediaTypeChange: (value: string) => void
  handleDateRangeChange: (from: string, to: string) => void
  handlePageChange: (page: number) => void
}

interface FilterPatch {
  anime_id?: string
  fansub_group_id?: string
  release_version_id?: string
  media_type?: string
  from?: string
  to?: string
  offset?: number
}

/**
 * Synchronisiert die Medien-Filter des User-Detail-Tabs (Anime/Gruppe/Release-
 * oder-Episode/Medientyp/Zeitraum, D12/D13/D14/D23) ueber die URL — exakte
 * Struktur wie useClaimsListFilters.ts (useRouter/usePathname/useSearchParams,
 * `router.replace(..., { scroll: false })`, nie `router.push`).
 */
export function useUserMediaFilters(limit = DEFAULT_LIMIT): UseUserMediaFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const animeId = searchParams.get('anime_id') ?? ''
  const fansubGroupId = searchParams.get('fansub_group_id') ?? ''
  const releaseVersionId = searchParams.get('release_version_id') ?? ''
  const mediaType = searchParams.get('media_type') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      const nextAnimeId = patch.anime_id !== undefined ? patch.anime_id : animeId
      const nextGroupId = patch.fansub_group_id !== undefined ? patch.fansub_group_id : fansubGroupId
      const nextReleaseVersionId =
        patch.release_version_id !== undefined ? patch.release_version_id : releaseVersionId
      const nextMediaType = patch.media_type !== undefined ? patch.media_type : mediaType
      const nextFrom = patch.from !== undefined ? patch.from : from
      const nextTo = patch.to !== undefined ? patch.to : to
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)

      if (nextAnimeId) nextSearchParams.set('anime_id', nextAnimeId)
      else nextSearchParams.delete('anime_id')

      if (nextGroupId) nextSearchParams.set('fansub_group_id', nextGroupId)
      else nextSearchParams.delete('fansub_group_id')

      if (nextReleaseVersionId) nextSearchParams.set('release_version_id', nextReleaseVersionId)
      else nextSearchParams.delete('release_version_id')

      if (nextMediaType) nextSearchParams.set('media_type', nextMediaType)
      else nextSearchParams.delete('media_type')

      if (nextFrom) nextSearchParams.set('from', nextFrom)
      else nextSearchParams.delete('from')

      if (nextTo) nextSearchParams.set('to', nextTo)
      else nextSearchParams.delete('to')

      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')

      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [
      animeId,
      fansubGroupId,
      from,
      mediaType,
      offset,
      pathname,
      releaseVersionId,
      router,
      searchParams,
      to,
    ],
  )

  const handleAnimeChange = useCallback(
    (value: string) => {
      writeParams({ anime_id: value })
    },
    [writeParams],
  )

  const handleGroupChange = useCallback(
    (value: string) => {
      writeParams({ fansub_group_id: value })
    },
    [writeParams],
  )

  const handleReleaseOrEpisodeChange = useCallback(
    (value: string) => {
      writeParams({ release_version_id: value })
    },
    [writeParams],
  )

  const handleMediaTypeChange = useCallback(
    (value: string) => {
      writeParams({ media_type: value })
    },
    [writeParams],
  )

  const handleDateRangeChange = useCallback(
    (nextFrom: string, nextTo: string) => {
      writeParams({ from: nextFrom, to: nextTo })
    },
    [writeParams],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      writeParams({ offset: (page - 1) * limit }, false)
    },
    [limit, writeParams],
  )

  // useMemo haelt die Referenz stabil, solange sich die zugrunde liegenden URL-Werte
  // nicht aendern (identisches Rationale wie useClaimsListFilters.ts: ein neues
  // Objektliteral bei jedem Render wuerde den in der konsumierenden Tab-Komponente
  // auf `params` referenzierenden useCallback bei jedem Render neu erzeugen und damit
  // eine Endlosschleife aus useEffect -> loadData -> Render -> neues `params`-Objekt
  // -> useEffect ... ausloesen).
  const params: AdminUserMediaParams = useMemo(
    () => ({
      anime_id: animeId ? Number(animeId) : undefined,
      fansub_group_id: fansubGroupId ? Number(fansubGroupId) : undefined,
      release_version_id: releaseVersionId ? Number(releaseVersionId) : undefined,
      media_type: mediaType || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      offset,
    }),
    [animeId, fansubGroupId, from, limit, mediaType, offset, releaseVersionId, to],
  )

  return {
    params,
    handleAnimeChange,
    handleGroupChange,
    handleReleaseOrEpisodeChange,
    handleMediaTypeChange,
    handleDateRangeChange,
    handlePageChange,
  }
}
