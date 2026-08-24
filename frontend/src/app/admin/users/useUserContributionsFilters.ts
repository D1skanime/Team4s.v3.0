'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { AdminUserContributionsParams } from '@/types/admin-users'

const DEFAULT_LIMIT = 25

export interface UseUserContributionsFiltersResult {
  params: AdminUserContributionsParams
  handleAnimeChange: (value: string) => void
  handleGroupChange: (value: string) => void
  handleRoleChange: (value: string) => void
  handleOnlyDeviationsChange: (value: boolean) => void
  handleDateRangeChange: (from: string, to: string) => void
  handlePageChange: (page: number) => void
}

interface FilterPatch {
  anime_id?: string
  fansub_group_id?: string
  role_code?: string
  only_deviations?: string
  from?: string
  to?: string
  offset?: number
}

/**
 * Synchronisiert die Beitraege-Filter des User-Detail-Tabs (Anime/Gruppe/Rolle/
 * nur Abweichungen/Zeitraum, D08/D09/D10/D23) ueber die URL — exakte Struktur
 * wie useClaimsListFilters.ts (useRouter/usePathname/useSearchParams,
 * `router.replace(..., { scroll: false })`, nie `router.push`).
 * `only_deviations` wird als '1'/abwesend kodiert (nicht 'true'/'false'), analog
 * zur bestehenden `has_conflicts`-Konvention in ListUsers.
 */
export function useUserContributionsFilters(limit = DEFAULT_LIMIT): UseUserContributionsFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const animeId = searchParams.get('anime_id') ?? ''
  const fansubGroupId = searchParams.get('fansub_group_id') ?? ''
  const roleCode = searchParams.get('role_code') ?? ''
  const onlyDeviations = searchParams.get('only_deviations') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      const nextAnimeId = patch.anime_id !== undefined ? patch.anime_id : animeId
      const nextGroupId = patch.fansub_group_id !== undefined ? patch.fansub_group_id : fansubGroupId
      const nextRoleCode = patch.role_code !== undefined ? patch.role_code : roleCode
      const nextOnlyDeviations = patch.only_deviations !== undefined ? patch.only_deviations : onlyDeviations
      const nextFrom = patch.from !== undefined ? patch.from : from
      const nextTo = patch.to !== undefined ? patch.to : to
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)

      if (nextAnimeId) nextSearchParams.set('anime_id', nextAnimeId)
      else nextSearchParams.delete('anime_id')

      if (nextGroupId) nextSearchParams.set('fansub_group_id', nextGroupId)
      else nextSearchParams.delete('fansub_group_id')

      if (nextRoleCode) nextSearchParams.set('role_code', nextRoleCode)
      else nextSearchParams.delete('role_code')

      if (nextOnlyDeviations) nextSearchParams.set('only_deviations', nextOnlyDeviations)
      else nextSearchParams.delete('only_deviations')

      if (nextFrom) nextSearchParams.set('from', nextFrom)
      else nextSearchParams.delete('from')

      if (nextTo) nextSearchParams.set('to', nextTo)
      else nextSearchParams.delete('to')

      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')

      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [animeId, fansubGroupId, from, offset, onlyDeviations, pathname, roleCode, router, searchParams, to],
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

  const handleRoleChange = useCallback(
    (value: string) => {
      writeParams({ role_code: value })
    },
    [writeParams],
  )

  const handleOnlyDeviationsChange = useCallback(
    (value: boolean) => {
      writeParams({ only_deviations: value ? '1' : '' })
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
  const params: AdminUserContributionsParams = useMemo(
    () => ({
      anime_id: animeId ? Number(animeId) : undefined,
      fansub_group_id: fansubGroupId ? Number(fansubGroupId) : undefined,
      role_code: roleCode || undefined,
      only_deviations: onlyDeviations === '1' ? true : undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      offset,
    }),
    [animeId, fansubGroupId, from, limit, offset, onlyDeviations, roleCode, to],
  )

  return {
    params,
    handleAnimeChange,
    handleGroupChange,
    handleRoleChange,
    handleOnlyDeviationsChange,
    handleDateRangeChange,
    handlePageChange,
  }
}
