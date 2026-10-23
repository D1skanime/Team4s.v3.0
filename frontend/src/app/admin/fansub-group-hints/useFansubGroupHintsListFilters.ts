'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { AdminFansubGroupHintListParams } from '@/types/fansub-group-hints'

const DEFAULT_LIMIT = 25

export interface UseFansubGroupHintsListFiltersResult {
  params: AdminFansubGroupHintListParams
  handleStatusChange: (value: string) => void
  handleGroupChange: (value: string) => void
  handleDateRangeChange: (from: string, to: string) => void
  handlePageChange: (page: number) => void
}

interface FilterPatch {
  status?: string
  fansub_group_id?: string
  from?: string
  to?: string
  offset?: number
}

/**
 * Synchronisiert die Filter der plattform-weiten fansub_lead-Hinweisliste (Status/Zielgruppe/
 * Zeitraum, D-01/D-07) über die URL — exakte Struktur wie useClaimsListFilters.ts
 * (useRouter/usePathname/useSearchParams, `router.replace(..., { scroll: false })`, nie
 * `router.push`). Bewusst OHNE `app_user_id`- und `claim_type`-Felder: diese Liste hat weder
 * einen Benutzer-ID-Filter (191-UI-SPEC.md Component Contract C3) noch ein Claim-Typ-Konzept,
 * da jede Zeile serverseitig bereits eine `fansub_lead`-Mitgliedschaftsanfrage ist.
 */
export function useFansubGroupHintsListFilters(limit = DEFAULT_LIMIT): UseFansubGroupHintsListFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const status = searchParams.get('status') ?? ''
  const fansubGroupId = searchParams.get('fansub_group_id') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      const nextStatus = patch.status !== undefined ? patch.status : status
      const nextGroupId = patch.fansub_group_id !== undefined ? patch.fansub_group_id : fansubGroupId
      const nextFrom = patch.from !== undefined ? patch.from : from
      const nextTo = patch.to !== undefined ? patch.to : to
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)

      if (nextStatus) nextSearchParams.set('status', nextStatus)
      else nextSearchParams.delete('status')

      if (nextGroupId) nextSearchParams.set('fansub_group_id', nextGroupId)
      else nextSearchParams.delete('fansub_group_id')

      if (nextFrom) nextSearchParams.set('from', nextFrom)
      else nextSearchParams.delete('from')

      if (nextTo) nextSearchParams.set('to', nextTo)
      else nextSearchParams.delete('to')

      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')

      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [fansubGroupId, from, offset, pathname, router, searchParams, status, to],
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
  // ändern (identisches Rationale wie useClaimsListFilters.ts: ein neues Objektliteral bei jedem
  // Render würde den in FansubGroupHintsAdminClient.tsx auf `params` referenzierenden useCallback
  // bei jedem Render neu erzeugen und damit eine Endlosschleife aus useEffect -> loadHints ->
  // Render -> neues `params`-Objekt -> useEffect ... auslösen).
  const params: AdminFansubGroupHintListParams = useMemo(
    () => ({
      status: status || undefined,
      fansub_group_id: fansubGroupId ? Number(fansubGroupId) : undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      offset,
    }),
    [fansubGroupId, from, limit, offset, status, to],
  )

  return {
    params,
    handleStatusChange,
    handleGroupChange,
    handleDateRangeChange,
    handlePageChange,
  }
}
