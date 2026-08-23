'use client'

import { useCallback, useMemo } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import type { AdminChangesListParams } from '@/types/admin-users'

const DEFAULT_LIMIT = 25

export interface UseChangesListFiltersResult {
  params: AdminChangesListParams
  handleUserChange: (value: string) => void
  handleActorChange: (value: string) => void
  handleGroupChange: (value: string) => void
  handleTargetTypeChange: (value: string) => void
  handleDateRangeChange: (from: string, to: string) => void
  handlePageChange: (page: number) => void
}

interface FilterPatch {
  benutzer?: string
  akteur?: string
  gruppe?: string
  target_type?: string
  from?: string
  to?: string
  offset?: number
}

/**
 * Synchronisiert die zentrale Änderungen-Arbeitsqueue-Filter (Benutzer/Akteur/Gruppe/
 * Ziel-Typ/Zeitraum, D-25/D-28) über die URL — exakte Struktur wie useClaimsListFilters.ts
 * (useRouter/usePathname/useSearchParams, `router.replace(..., { scroll: false })`, nie
 * `router.push`). Die URL-Schlüssel entsprechen 1:1 den Query-Parametern von
 * GET /admin/changes (`benutzer`/`akteur`/`gruppe`/`target_type`/`from`/`to`).
 */
export function useChangesListFilters(limit = DEFAULT_LIMIT): UseChangesListFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const benutzer = searchParams.get('benutzer') ?? ''
  const akteur = searchParams.get('akteur') ?? ''
  const gruppe = searchParams.get('gruppe') ?? ''
  const targetType = searchParams.get('target_type') ?? ''
  const from = searchParams.get('from') ?? ''
  const to = searchParams.get('to') ?? ''
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      const nextBenutzer = patch.benutzer !== undefined ? patch.benutzer : benutzer
      const nextAkteur = patch.akteur !== undefined ? patch.akteur : akteur
      const nextGruppe = patch.gruppe !== undefined ? patch.gruppe : gruppe
      const nextTargetType = patch.target_type !== undefined ? patch.target_type : targetType
      const nextFrom = patch.from !== undefined ? patch.from : from
      const nextTo = patch.to !== undefined ? patch.to : to
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)

      if (nextBenutzer) nextSearchParams.set('benutzer', nextBenutzer)
      else nextSearchParams.delete('benutzer')

      if (nextAkteur) nextSearchParams.set('akteur', nextAkteur)
      else nextSearchParams.delete('akteur')

      if (nextGruppe) nextSearchParams.set('gruppe', nextGruppe)
      else nextSearchParams.delete('gruppe')

      if (nextTargetType) nextSearchParams.set('target_type', nextTargetType)
      else nextSearchParams.delete('target_type')

      if (nextFrom) nextSearchParams.set('from', nextFrom)
      else nextSearchParams.delete('from')

      if (nextTo) nextSearchParams.set('to', nextTo)
      else nextSearchParams.delete('to')

      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')

      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [akteur, benutzer, from, gruppe, offset, pathname, router, searchParams, targetType, to],
  )

  const handleUserChange = useCallback(
    (value: string) => {
      writeParams({ benutzer: value })
    },
    [writeParams],
  )

  const handleActorChange = useCallback(
    (value: string) => {
      writeParams({ akteur: value })
    },
    [writeParams],
  )

  const handleGroupChange = useCallback(
    (value: string) => {
      writeParams({ gruppe: value })
    },
    [writeParams],
  )

  const handleTargetTypeChange = useCallback(
    (value: string) => {
      writeParams({ target_type: value })
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
  // ändern (identisches Rationale wie useClaimsListFilters.ts/useUserListFilters.ts: ein neues
  // Objektliteral bei jedem Render würde den in ChangesClient.tsx auf `params` referenzierenden
  // useCallback bei jedem Render neu erzeugen und damit eine Endlosschleife aus useEffect ->
  // loadChanges -> Render -> neues `params`-Objekt -> useEffect ... auslösen).
  const params: AdminChangesListParams = useMemo(
    () => ({
      benutzer: benutzer ? Number(benutzer) : undefined,
      akteur: akteur ? Number(akteur) : undefined,
      gruppe: gruppe ? Number(gruppe) : undefined,
      target_type: targetType || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
      offset,
    }),
    [akteur, benutzer, from, gruppe, limit, offset, targetType, to],
  )

  return {
    params,
    handleUserChange,
    handleActorChange,
    handleGroupChange,
    handleTargetTypeChange,
    handleDateRangeChange,
    handlePageChange,
  }
}
