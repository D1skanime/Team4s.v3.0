'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import type { AdminUserListParams } from '@/types/admin-users'

const DEBOUNCE_MS = 300
const DEFAULT_LIMIT = 25

export interface UseUserListFiltersResult {
  params: AdminUserListParams
  searchValue: string
  handleSearchChange: (value: string) => void
  handleStatusChange: (value: string) => void
  handleRoleChange: (value: string) => void
  handlePageChange: (page: number) => void
}

interface FilterPatch {
  q?: string
  status?: string
  role?: string
  offset?: number
}

/**
 * Synchronisiert q/status/role der Benutzerliste über die URL (D-06), analog zu
 * useFansubEditMainTab.ts. `q` behaelt den lokalen Debounce-Zwischenwert (300ms) bei;
 * status/role schreiben sofort. Die URL-Schluessel bleiben `q`/`status`/`role` — die
 * Uebersetzung `role` -> API-Parameter `global_role` erfolgt ausschliesslich im
 * zurueckgegebenen `params`-Objekt, nicht in der URL selbst.
 */
export function useUserListFilters(limit = DEFAULT_LIMIT): UseUserListFiltersResult {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const q = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? ''
  const role = searchParams.get('role') ?? ''
  const offset = Number(searchParams.get('offset') ?? '0') || 0

  const [searchValue, setSearchValue] = useState(q)

  useEffect(() => {
    // Haelt den Debounce-Zwischenwert mit der URL synchron (z. B. bei Browser-Zurueck).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSearchValue((current) => (current === q ? current : q))
  }, [q])

  // Entkoppelt vom obigen URL-Sync (D-01/184-REVIEW-FIX): pendingSearch wird NUR von
  // handleSearchChange gesetzt, nie vom q-Sync-Effekt -- sonst wuerde ein externer
  // URL-Wechsel (z. B. Browser-Zurueck) nach Ablauf des Debounce writeParams erneut
  // ausloesen und offset faelschlich auf 0 zuruecksetzen.
  const [pendingSearch, setPendingSearch] = useState<string | null>(null)
  const debouncedPendingSearch = useDebouncedValue(pendingSearch, DEBOUNCE_MS)
  const appliedSearchRef = useRef<string | null>(null)

  const writeParams = useCallback(
    (patch: FilterPatch, resetOffset = true) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString())

      const nextQ = patch.q !== undefined ? patch.q : q
      const nextStatus = patch.status !== undefined ? patch.status : status
      const nextRole = patch.role !== undefined ? patch.role : role
      const nextOffset = resetOffset ? 0 : (patch.offset ?? offset)

      if (nextQ) nextSearchParams.set('q', nextQ)
      else nextSearchParams.delete('q')

      if (nextStatus) nextSearchParams.set('status', nextStatus)
      else nextSearchParams.delete('status')

      if (nextRole) nextSearchParams.set('role', nextRole)
      else nextSearchParams.delete('role')

      if (nextOffset > 0) nextSearchParams.set('offset', String(nextOffset))
      else nextSearchParams.delete('offset')

      const query = nextSearchParams.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [offset, pathname, q, role, router, searchParams, status],
  )

  useEffect(() => {
    if (debouncedPendingSearch === null) return
    if (appliedSearchRef.current === debouncedPendingSearch) return
    appliedSearchRef.current = debouncedPendingSearch
    writeParams({ q: debouncedPendingSearch })
  }, [debouncedPendingSearch, writeParams])

  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
    setPendingSearch(value)
  }, [])

  const handleStatusChange = useCallback(
    (value: string) => {
      writeParams({ status: value })
    },
    [writeParams],
  )

  const handleRoleChange = useCallback(
    (value: string) => {
      writeParams({ role: value })
    },
    [writeParams],
  )

  const handlePageChange = useCallback(
    (page: number) => {
      writeParams({ offset: (page - 1) * limit }, false)
    },
    [limit, writeParams],
  )

  // useMemo haelt die Referenz stabil, solange sich die zugrunde liegenden
  // URL-Werte nicht aendern (Rule 1: ein neues Objektliteral bei jedem Aufruf
  // wuerde den auf `params` referenzierenden useCallback in AdminUsersClient bei
  // jedem Render neu erzeugen und damit eine Endlosschleife aus useEffect ->
  // loadUsers -> Render -> neues `params`-Objekt -> useEffect ... ausloesen).
  const params: AdminUserListParams = useMemo(
    () => ({
      sort: 'last_activity_desc',
      limit,
      offset,
      q: q || undefined,
      status: status || undefined,
      global_role: role || undefined,
    }),
    [limit, offset, q, role, status],
  )

  return {
    params,
    searchValue,
    handleSearchChange,
    handleStatusChange,
    handleRoleChange,
    handlePageChange,
  }
}
