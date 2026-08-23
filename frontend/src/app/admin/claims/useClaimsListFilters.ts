'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { AdminClaimsListParams } from '@/types/admin-users'

const DEFAULT_LIMIT = 25

export interface UseClaimsListFiltersResult {
  params: AdminClaimsListParams
  handleStatusChange: (value: string) => void
  handleGroupChange: (value: string) => void
  handleUserChange: (value: string) => void
  handleDateRangeChange: (from: string, to: string) => void
  handlePageChange: (page: number) => void
}

interface FilterPatch {
  status?: string
  fansub_group_id?: string
  app_user_id?: string
  from?: string
  to?: string
  offset?: number
}

/**
 * Synchronisiert die Claims-Arbeitsqueue-Filter (Status/Gruppe/Benutzer/Zeitraum, D-23/D-28)
 * über die URL — exakte Struktur wie useUserListFilters.ts (useRouter/usePathname/useSearchParams,
 * `router.replace(..., { scroll: false })`, nie `router.push`). `claim_type` ist heute immer
 * `'claim'` (einziger realer Wert, siehe ClaimsClient.tsx) und bekommt bewusst keinen eigenen
 * Setter — nur ein statischer Wert im zurückgegebenen `params`-Objekt.
 */
export function useClaimsListFilters(limit = DEFAULT_LIMIT): UseClaimsListFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const fansubGroupId = searchParams.get('fansub_group_id') ?? ''
  const appUserId = searchParams.get('app_user_id') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      const nextStatus = patch.status !== undefined ? patch.status : status
      const nextGroupId = patch.fansub_group_id !== undefined ? patch.fansub_group_id : fansubGroupId
      const nextUserId = patch.app_user_id !== undefined ? patch.app_user_id : appUserId
      const nextFrom = patch.from !== undefined ? patch.from : from
      const nextTo = patch.to !== undefined ? patch.to : to
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)

      if (nextStatus) nextSearchParams.set('status', nextStatus)
      else nextSearchParams.delete('status')

      if (nextGroupId) nextSearchParams.set('fansub_group_id', nextGroupId)
      else nextSearchParams.delete('fansub_group_id')

      if (nextUserId) nextSearchParams.set('app_user_id', nextUserId)
      else nextSearchParams.delete('app_user_id')

      if (nextFrom) nextSearchParams.set('from', nextFrom)
      else nextSearchParams.delete('from')

      if (nextTo) nextSearchParams.set('to', nextTo)
      else nextSearchParams.delete('to')

      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')

      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [appUserId, fansubGroupId, from, offset, pathname, router, searchParams, status, to],
  )

  const handleStatusChange = useCallback(
    (value: string) => {
      writeParams({ status: value })
    },
    [writeParams],
  )

  const handleGroupChange = useCallback(
    (value: string) => {
      writeParams({ fansub_group_id: value })
    },
    [writeParams],
  )

  const handleUserChange = useCallback(
    (value: string) => {
      writeParams({ app_user_id: value })
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

  // useMemo hält die Referenz stabil, solange sich die zugrunde liegenden URL-Werte nicht
  // ändern (identisches Rationale wie useUserListFilters.ts: ein neues Objektliteral bei jedem
  // Render würde den in ClaimsClient.tsx auf `params` referenzierenden useCallback bei jedem
  // Render neu erzeugen und damit eine Endlosschleife aus useEffect -> loadClaims -> Render ->
  // neues `params`-Objekt -> useEffect ... auslösen).
  const params: AdminClaimsListParams = useMemo(
    () => ({
      status: status || undefined,
      claim_type: 'claim',
      fansub_group_id: fansubGroupId ? Number(fansubGroupId) : undefined,
      app_user_id: appUserId ? Number(appUserId) : undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      offset,
    }),
    [appUserId, fansubGroupId, from, limit, offset, status, to],
  )

  return {
    params,
    handleStatusChange,
    handleGroupChange,
    handleUserChange,
    handleDateRangeChange,
    handlePageChange,
  }
}
