'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MoreHorizontal, Pencil, Trash2, Users } from 'lucide-react'

import {
  ApiError,
  deleteFansubGroup,
  getFansubAliases,
  getFansubList,
  getFansubMembers,
  getRuntimeAuthToken,
  updateFansubGroup,
} from '@/lib/api'
import { FansubGroup, FansubStatus } from '@/types/fansub'

import sharedStyles from '../admin.module.css'
import fansubStyles from './fansubs.module.css'

const styles = { ...sharedStyles, ...fansubStyles }

type StatusFilter = 'all' | 'active' | 'inactive' | 'archived'
type SortKey = 'name' | 'status' | 'period'
type SortDirection = 'asc' | 'desc'

const PAGE_SIZE = 20
const SEARCH_DEBOUNCE_MS = 300

const statusFilterOptions: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Alle Stati' },
  { value: 'active', label: 'active' },
  { value: 'inactive', label: 'inactive' },
  { value: 'archived', label: 'archived' },
]

const bulkStatusOptions: Array<{ value: FansubStatus; label: string }> = [
  { value: 'active', label: 'active' },
  { value: 'inactive', label: 'inactive' },
  { value: 'dissolved', label: 'archived' },
]

function formatError(error: unknown): string {
  if (error instanceof ApiError) return `(${error.status}) ${error.message}`
  return 'Anfrage fehlgeschlagen.'
}

function statusLabel(status: FansubStatus): string {
  if (status === 'dissolved') return 'archived'
  return status
}

function statusRank(status: FansubStatus): number {
  if (status === 'active') return 0
  if (status === 'inactive') return 1
  return 2
}

function periodValue(group: FansubGroup): number {
  if (typeof group.founded_year === 'number') return group.founded_year
  if (typeof group.dissolved_year === 'number') return group.dissolved_year
  return Number.MAX_SAFE_INTEGER
}

function formatPeriod(group: FansubGroup): string {
  const start = group.founded_year ?? 'n/a'
  const end = group.dissolved_year ?? 'heute'
  return `${start} - ${end}`
}

export default function AdminFansubsPage() {
  const [authToken] = useState(() => getRuntimeAuthToken())
  const [isLoading, setIsLoading] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [items, setItems] = useState<FansubGroup[]>([])
  const [memberCounts, setMemberCounts] = useState<Record<number, number | null>>({})
  const [aliasesByGroup, setAliasesByGroup] = useState<Record<number, string[] | null>>({})
  const [queryInput, setQueryInput] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [page, setPage] = useState(1)
  const [selectedIDs, setSelectedIDs] = useState<Set<number>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<FansubStatus>('inactive')
  const [mobileMenuGroupID, setMobileMenuGroupID] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const selectAllRef = useRef<HTMLInputElement | null>(null)

  const loadList = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      const perPage = 500
      let currentPage = 1
      let totalPages = 1
      const allItems: FansubGroup[] = []

      do {
        const response = await getFansubList({
          page: currentPage,
          per_page: perPage,
        })
        allItems.push(...response.data)
        totalPages = response.meta.total_pages || 1
        currentPage += 1
      } while (currentPage <= totalPages)

      setItems(allItems)
      setSelectedIDs(new Set<number>())
      setMemberCounts({})
      setAliasesByGroup({})
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    const timeoutID = window.setTimeout(() => {
      setQuery(queryInput.trim().toLowerCase())
    }, SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timeoutID)
  }, [queryInput])

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const statusMatches =
        statusFilter === 'all'
          ? true
          : statusFilter === 'archived'
            ? item.status === 'dissolved'
            : item.status === statusFilter

      if (!statusMatches) return false
      if (!query) return true

      const name = item.name.toLowerCase()
      const slug = item.slug.toLowerCase()
      const aliases = aliasesByGroup[item.id] ?? []
      const aliasMatches = aliases.some((alias) => alias.toLowerCase().includes(query))
      return name.includes(query) || slug.includes(query) || aliasMatches
    })
  }, [aliasesByGroup, items, query, statusFilter])

  const sortedItems = useMemo(() => {
    const next = [...filteredItems]
    next.sort((left, right) => {
      let cmp = 0
      if (sortKey === 'name') {
        cmp = left.name.localeCompare(right.name, 'de', { sensitivity: 'base' })
      } else if (sortKey === 'status') {
        cmp = statusRank(left.status) - statusRank(right.status)
      } else {
        cmp = periodValue(left) - periodValue(right)
      }

      if (cmp === 0) cmp = left.name.localeCompare(right.name, 'de', { sensitivity: 'base' })
      return sortDirection === 'asc' ? cmp : -cmp
    })
    return next
  }, [filteredItems, sortDirection, sortKey])

  const totalFiltered = sortedItems.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE))
  const pageStart = (page - 1) * PAGE_SIZE
  const pageEnd = pageStart + PAGE_SIZE
  const pagedItems = sortedItems.slice(pageStart, pageEnd)
  const visibleCount = totalFiltered === 0 ? 0 : Math.min(page * PAGE_SIZE, totalFiltered)

  useEffect(() => {
    setPage(1)
  }, [query, statusFilter, sortDirection, sortKey])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const pageIDs = pagedItems.map((item) => item.id)
  const selectedOnPage = pageIDs.filter((id) => selectedIDs.has(id))
  const allOnPageSelected = pageIDs.length > 0 && selectedOnPage.length === pageIDs.length
  const hasPartialPageSelection = selectedOnPage.length > 0 && !allOnPageSelected

  useEffect(() => {
    if (!selectAllRef.current) return
    selectAllRef.current.indeterminate = hasPartialPageSelection
  }, [hasPartialPageSelection])

  useEffect(() => {
    const unresolved = pagedItems.filter((item) => memberCounts[item.id] === undefined)
    if (unresolved.length === 0) return

    let cancelled = false
    void Promise.all(
      unresolved.map(async (item) => {
        try {
          const response = await getFansubMembers(item.id)
          return { id: item.id, count: response.data.length as number | null }
        } catch {
          return { id: item.id, count: null as number | null }
        }
      }),
    ).then((entries) => {
      if (cancelled) return
      setMemberCounts((prev) => {
        const next = { ...prev }
        entries.forEach((entry) => {
          if (next[entry.id] === undefined) next[entry.id] = entry.count
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [memberCounts, pagedItems])

  useEffect(() => {
    const unresolved = pagedItems.filter((item) => aliasesByGroup[item.id] === undefined)
    if (unresolved.length === 0) return

    let cancelled = false
    void Promise.all(
      unresolved.map(async (item) => {
        try {
          const response = await getFansubAliases(item.id)
          return { id: item.id, aliases: response.data.map((entry) => entry.alias) as string[] | null }
        } catch {
          return { id: item.id, aliases: null as string[] | null }
        }
      }),
    ).then((entries) => {
      if (cancelled) return
      setAliasesByGroup((prev) => {
        const next = { ...prev }
        entries.forEach((entry) => {
          if (next[entry.id] === undefined) next[entry.id] = entry.aliases
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [aliasesByGroup, pagedItems])

  function toggleSort(nextSortKey: SortKey) {
    if (sortKey === nextSortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(nextSortKey)
    setSortDirection('asc')
  }

  function toggleSelection(id: number) {
    setSelectedIDs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAllOnPage() {
    setSelectedIDs((prev) => {
      const next = new Set(prev)
      if (allOnPageSelected) {
        pageIDs.forEach((id) => next.delete(id))
      } else {
        pageIDs.forEach((id) => next.add(id))
      }
      return next
    })
  }

  async function onDelete(item: FansubGroup) {
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const ok = window.confirm(
      `Fansub "${item.name}" wirklich loeschen?\n\nEpisoden bleiben erhalten; fansub_group_id wird entkoppelt.`,
    )
    if (!ok) return

    setIsMutating(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      await deleteFansubGroup(item.id, authToken)
      setSuccessMessage(`Fansub "${item.name}" geloescht.`)
      await loadList()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsMutating(false)
    }
  }

  async function onBulkDelete() {
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    const selected = items.filter((item) => selectedIDs.has(item.id))
    if (selected.length === 0) return

    const ok = window.confirm(
      `${selected.length} Fansub-Gruppen wirklich loeschen?\n\nEpisoden bleiben erhalten; fansub_group_id wird entkoppelt.`,
    )
    if (!ok) return

    setIsMutating(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      for (const item of selected) {
        await deleteFansubGroup(item.id, authToken)
      }
      setSuccessMessage(`${selected.length} Fansub-Gruppen geloescht.`)
      await loadList()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsMutating(false)
    }
  }

  async function onBulkStatusChange() {
    if (!authToken) {
      setErrorMessage('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }
    if (selectedIDs.size === 0) return

    setIsMutating(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      const selected = items.filter((item) => selectedIDs.has(item.id))
      for (const item of selected) {
        await updateFansubGroup(item.id, { status: bulkStatus }, authToken)
      }
      setSuccessMessage(`${selected.length} Gruppen auf "${statusLabel(bulkStatus)}" gesetzt.`)
      await loadList()
    } catch (error) {
      setErrorMessage(formatError(error))
    } finally {
      setIsMutating(false)
    }
  }

  return (
    <main className={`${styles.page} ${styles.fansubAdminPage}`}>
      <p className={styles.backLinks}>
        <Link href="/admin">Admin</Link>
        <span> | </span>
        <Link href="/anime">Anime</Link>
      </p>

      <header className={styles.header}>
        <h1 className={styles.title}>Fansub Verwaltung</h1>
        <p className={styles.subtitle}>Gruppen suchen, filtern, bearbeiten und loeschen.</p>
      </header>

      <section className={styles.panel}>
        <div className={styles.fansubTopActions}>
          <Link href="/admin/fansubs/create" className={`${styles.button} ${styles.fansubTopActionButton}`}>
            + Neue Fansubgruppe
          </Link>
          <Link href="/admin/fansubs/merge" className={`${styles.buttonSecondary} ${styles.fansubTopActionButton}`}>
            Gruppen zusammenfuehren
          </Link>
        </div>

        <div className={styles.fansubFilterBar}>
          <div className={`${styles.field} ${styles.fansubFilterSearch}`}>
            <label htmlFor="fansub-query">Suche</label>
            <input
              id="fansub-query"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              placeholder="Name, Slug oder Tag..."
            />
          </div>
          <div className={`${styles.field} ${styles.fansubFilterSelect}`}>
            <label htmlFor="fansub-status">Status</label>
            <select id="fansub-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
              {statusFilterOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={`${styles.field} ${styles.fansubFilterSelect}`}>
            <label htmlFor="fansub-sort">Sortierung</label>
            <select id="fansub-sort" value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
              <option value="name">Name</option>
              <option value="status">Status</option>
              <option value="period">Zeitraum</option>
            </select>
          </div>
          <div className={`${styles.field} ${styles.fansubFilterSelect}`}>
            <label htmlFor="fansub-direction">Richtung</label>
            <select
              id="fansub-direction"
              value={sortDirection}
              onChange={(event) => setSortDirection(event.target.value as SortDirection)}
            >
              <option value="asc">Aufsteigend</option>
              <option value="desc">Absteigend</option>
            </select>
          </div>
        </div>

        {selectedIDs.size > 0 ? (
          <div className={styles.fansubBulkBar}>
            <span className={styles.fansubBulkInfo}>{selectedIDs.size} ausgewaehlt</span>
            <div className={styles.fansubBulkControls}>
              <select
                value={bulkStatus}
                onChange={(event) => setBulkStatus(event.target.value as FansubStatus)}
                className={styles.fansubBulkSelect}
              >
                {bulkStatusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => void onBulkStatusChange()}
                disabled={isMutating}
              >
                Status aendern
              </button>
              <Link href="/admin/fansubs/merge" className={styles.buttonSecondary}>
                Zusammenfuehren
              </Link>
              <button
                type="button"
                className={`${styles.buttonSecondary} ${styles.buttonDanger}`}
                onClick={() => void onBulkDelete()}
                disabled={isMutating}
              >
                Loeschen
              </button>
            </div>
          </div>
        ) : null}

        {errorMessage ? <div className={styles.errorBox}>{errorMessage}</div> : null}
        {successMessage ? <div className={styles.successBox}>{successMessage}</div> : null}
        {isLoading ? <p className={styles.hint}>Lade...</p> : null}

        {!isLoading && filteredItems.length === 0 ? <p className={styles.hint}>Keine Fansubgruppen gefunden.</p> : null}

        {!isLoading && filteredItems.length > 0 ? (
          <div className={styles.fansubTableShell}>
            <div className={styles.fansubDesktopTableWrap}>
              <table className={styles.fansubTable}>
                <thead>
                  <tr>
                    <th>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleSelectAllOnPage}
                        aria-label="Alle sichtbaren Gruppen auswaehlen"
                      />
                    </th>
                    <th>
                      <button type="button" className={styles.fansubSortButton} onClick={() => toggleSort('name')}>
                        Gruppenname {sortKey === 'name' ? (sortDirection === 'asc' ? '^' : 'v') : ''}
                      </button>
                    </th>
                    <th>Slug</th>
                    <th>
                      <button type="button" className={styles.fansubSortButton} onClick={() => toggleSort('status')}>
                        Status {sortKey === 'status' ? (sortDirection === 'asc' ? '^' : 'v') : ''}
                      </button>
                    </th>
                    <th>
                      <button type="button" className={styles.fansubSortButton} onClick={() => toggleSort('period')}>
                        Zeitraum {sortKey === 'period' ? (sortDirection === 'asc' ? '^' : 'v') : ''}
                      </button>
                    </th>
                    <th>Mitglieder</th>
                    <th className={styles.fansubActionsHeader}>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.map((item) => {
                    const count = memberCounts[item.id]
                    const aliases = aliasesByGroup[item.id] ?? []
                    const primaryAlias = aliases.length > 0 ? aliases[0] : null
                    const badgeClass =
                      item.status === 'active'
                        ? styles.fansubStatusActive
                        : item.status === 'inactive'
                          ? styles.fansubStatusInactive
                          : styles.fansubStatusArchived

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={selectedIDs.has(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            aria-label={`Gruppe ${item.name} auswaehlen`}
                          />
                        </td>
                        <td className={styles.fansubNameCell}>{item.name}</td>
                        <td className={styles.fansubSlugCell}>
                          <div className={styles.fansubSlugBlock}>
                            <span className={styles.fansubSlugText}>{item.slug}</span>
                            {primaryAlias ? (
                              <span className={styles.fansubAliasTag} title={`Tag: ${primaryAlias}`}>
                                Tag: {primaryAlias}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td>
                          <span className={`${styles.fansubStatusBadge} ${badgeClass}`}>{statusLabel(item.status)}</span>
                        </td>
                        <td className={styles.fansubPeriodCell}>{formatPeriod(item)}</td>
                        <td className={styles.fansubMemberCell}>{count === undefined ? '...' : count === null ? 'n/a' : count}</td>
                        <td>
                          <div className={styles.fansubActionGroup}>
                            <Link
                              href={`/admin/fansubs/${item.id}/edit`}
                              className={styles.fansubIconButton}
                              aria-label={`Edit ${item.name}`}
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </Link>
                            <Link
                              href={`/admin/fansubs/${item.id}/members`}
                              className={styles.fansubIconButton}
                              aria-label={`Members ${item.name}`}
                              title="Members"
                            >
                              <Users size={14} />
                            </Link>
                            <button
                              type="button"
                              className={`${styles.fansubIconButton} ${styles.fansubIconButtonDanger}`}
                              onClick={() => void onDelete(item)}
                              disabled={isMutating}
                              aria-label={`Delete ${item.name}`}
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className={styles.fansubMobileList}>
              {pagedItems.map((item) => {
                const count = memberCounts[item.id]
                const aliases = aliasesByGroup[item.id] ?? []
                const primaryAlias = aliases.length > 0 ? aliases[0] : null
                const badgeClass =
                  item.status === 'active'
                    ? styles.fansubStatusActive
                    : item.status === 'inactive'
                      ? styles.fansubStatusInactive
                      : styles.fansubStatusArchived

                return (
                  <article key={item.id} className={styles.fansubCard}>
                    <div className={styles.fansubCardTop}>
                      <label className={styles.fansubCardCheckLabel}>
                        <input
                          type="checkbox"
                          checked={selectedIDs.has(item.id)}
                          onChange={() => toggleSelection(item.id)}
                          aria-label={`Gruppe ${item.name} auswaehlen`}
                        />
                      </label>
                      <div className={styles.fansubCardMeta}>
                        <h3 className={styles.fansubCardName}>{item.name}</h3>
                        <p className={styles.fansubCardSlug}>{item.slug}</p>
                        {primaryAlias ? <p className={styles.fansubCardAlias}>Tag: {primaryAlias}</p> : null}
                      </div>
                      <div className={styles.fansubCardMenu}>
                        <button
                          type="button"
                          className={styles.fansubMenuButton}
                          onClick={() => setMobileMenuGroupID((prev) => (prev === item.id ? null : item.id))}
                          aria-label="Aktionen"
                        >
                          <MoreHorizontal size={16} />
                        </button>
                        {mobileMenuGroupID === item.id ? (
                          <div className={styles.fansubMenuPopup}>
                            <Link href={`/admin/fansubs/${item.id}/edit`} className={styles.fansubMenuItem}>
                              <Pencil size={14} />
                              Edit
                            </Link>
                            <Link href={`/admin/fansubs/${item.id}/members`} className={styles.fansubMenuItem}>
                              <Users size={14} />
                              Members
                            </Link>
                            <button
                              type="button"
                              className={`${styles.fansubMenuItem} ${styles.fansubMenuItemDanger}`}
                              onClick={() => void onDelete(item)}
                              disabled={isMutating}
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className={styles.fansubCardData}>
                      <span className={`${styles.fansubStatusBadge} ${badgeClass}`}>{statusLabel(item.status)}</span>
                      <span className={styles.fansubCardDetail}>Zeitraum: {formatPeriod(item)}</span>
                      <span className={styles.fansubCardDetail}>
                        Mitglieder: {count === undefined ? '...' : count === null ? 'n/a' : count}
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>

            <div className={styles.fansubTableFooter}>
              <span className={styles.fansubPaginationSummary}>
                Zeige {visibleCount} von {totalFiltered} Gruppen
              </span>
              <div className={styles.fansubPagination}>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page <= 1}
                >
                  Zurueck
                </button>
                <span className={styles.fansubPaginationLabel}>
                  Seite {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className={styles.buttonSecondary}
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={page >= totalPages}
                >
                  Weiter
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}
