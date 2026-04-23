'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'

import { getFansubList } from '@/lib/api'
import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'
import type { FansubGroup } from '@/types/fansub'

import styles from './page.module.css'

interface EpisodeImportMappingRowCardProps {
  episodeNumber: number
  row: EpisodeImportMappingRow
  onSetTargets: (mediaItemID: string, rawTargets: string) => void
  onSetRelease: (mediaItemID: string, meta: { fansubGroupName?: string; releaseVersion?: string }) => void
  onSetSelectedFansubGroups: (mediaItemID: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onAddSelectedFansubGroup: (mediaItemID: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onRemoveSelectedFansubGroup: (mediaItemID: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onApplyFansubGroupToEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onApplyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onSkip: (mediaItemID: string) => void
}

export function EpisodeImportMappingRowCard({
  episodeNumber,
  row,
  onSetTargets,
  onSetRelease,
  onSetSelectedFansubGroups,
  onAddSelectedFansubGroup,
  onRemoveSelectedFansubGroup,
  onApplyFansubGroupToEpisode,
  onApplyFansubGroupFromEpisode,
  onSkip,
}: EpisodeImportMappingRowCardProps) {
  const label = row.file_name || row.media_item_id
  const isSkipped = row.status === 'skipped'
  const selectedFansubGroups = row.fansub_groups ?? []

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FansubGroup[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)

  const hasSelectedGroups = selectedFansubGroups.length > 0

  const selectedGroupKeys = useMemo(
    () =>
      new Set(
        selectedFansubGroups.map((group) =>
          typeof group.id === 'number' && Number.isFinite(group.id)
            ? `id:${group.id}`
            : `name:${(group.name ?? group.slug ?? '').trim().toLowerCase()}`,
        ),
      ),
    [selectedFansubGroups],
  )

  useEffect(() => {
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }, [row.media_item_id, row.status])

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (isSkipped || trimmedQuery.length < 1) {
      setResults([])
      setSearchMessage(null)
      setIsSearching(false)
      return
    }

    let cancelled = false
    const timeoutID = window.setTimeout(async () => {
      setIsSearching(true)
      setSearchMessage(null)
      try {
        const response = await getFansubList({ q: trimmedQuery, page: 1, per_page: 10 })
        if (cancelled) {
          return
        }
        const nextResults = response.data.filter((group) => {
          if (group.group_type === 'collaboration') {
            return false
          }
          return !selectedGroupKeys.has(`id:${group.id}`)
        })
        setResults(nextResults)
        if (nextResults.length === 0) {
          setSearchMessage('Keine bestehende Gruppe gefunden. Neue Eingabe kann als Chip hinzugefuegt werden.')
        }
      } catch {
        if (!cancelled) {
          setSearchMessage('Fansub-Gruppen konnten nicht geladen werden.')
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }, 180)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutID)
    }
  }, [isSkipped, query, selectedGroupKeys])

  function handleAddFreeTextChip() {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return
    }

    const nextGroup = { name: trimmedQuery }
    onAddSelectedFansubGroup(row.media_item_id, nextGroup)
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }

  function handleSelectExistingGroup(group: FansubGroup) {
    onAddSelectedFansubGroup(row.media_item_id, { id: group.id, name: group.name, slug: group.slug })
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }

  function handleGroupInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      handleAddFreeTextChip()
      return
    }

    if (event.key === 'Backspace' && !query.trim() && selectedFansubGroups.length > 0) {
      event.preventDefault()
      const lastGroup = selectedFansubGroups[selectedFansubGroups.length - 1]
      onRemoveSelectedFansubGroup(row.media_item_id, lastGroup)
    }
  }

  function handleClearGroups() {
    onSetSelectedFansubGroups(row.media_item_id, [])
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }

  return (
    <div className={`${styles.mappingRow} ${styles[row.status]}`}>
      <div className={styles.mappingRowFile}>
        <strong className={styles.fileName}>{label}</strong>
        {row.display_path ? <span className={styles.displayPath}>{row.display_path}</span> : null}
        {(row.target_episode_numbers ?? []).length > 1 ? (
          <span className={styles.multiEpisodeHint}>Deckt {row.target_episode_numbers.length} Episoden ab</span>
        ) : null}
        <div className={styles.releaseMetaRow}>
          <label className={`${styles.releaseMeta} ${styles.releaseMetaGroup}`}>
            <span className={styles.releaseMetaLabel}>Gruppe</span>
            <div className={styles.groupSelector}>
              <div className={styles.groupChipWrap}>
                {hasSelectedGroups ? (
                  selectedFansubGroups.map((group) => (
                    <button
                      key={group.id ?? `${group.name ?? group.slug ?? 'group'}-${row.media_item_id}`}
                      type="button"
                      className={styles.groupChip}
                      disabled={isSkipped}
                      onClick={() => onRemoveSelectedFansubGroup(row.media_item_id, group)}
                    >
                      <span>{group.name ?? group.slug ?? `#${group.id}`}</span>
                      <span className={styles.groupChipRemove}>x</span>
                    </button>
                  ))
                ) : (
                  <span className={styles.groupPlaceholder}>Keine Gruppe gewaehlt.</span>
                )}
              </div>
              <div className={styles.groupInputRow}>
                <input
                  className={styles.releaseMetaInput}
                  value={query}
                  disabled={isSkipped}
                  placeholder="Gruppe suchen oder neu tippen"
                  aria-label={`Fansub-Gruppen fuer ${label}`}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={handleGroupInputKeyDown}
                />
                <button
                  className={styles.releaseScopeButton}
                  type="button"
                  disabled={isSkipped || !query.trim()}
                  onClick={handleAddFreeTextChip}
                >
                  Als Chip
                </button>
                <button
                  className={styles.releaseScopeButton}
                  type="button"
                  disabled={isSkipped || !hasSelectedGroups}
                  onClick={handleClearGroups}
                >
                  Leeren
                </button>
              </div>
              {isSearching ? <p className={styles.groupSearchState}>Suche laeuft...</p> : null}
              {!isSearching && searchMessage ? <p className={styles.groupSearchState}>{searchMessage}</p> : null}
              {!isSearching && results.length > 0 ? (
                <div className={styles.groupSearchResults}>
                  {results.map((group) => (
                    <button
                      key={group.id}
                      type="button"
                      className={styles.groupSearchOption}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        handleSelectExistingGroup(group)
                      }}
                    >
                      <span>{group.name}</span>
                      <span className={styles.groupSearchMeta}>#{group.id}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <div className={styles.releaseMetaActions}>
              <button
                className={styles.releaseScopeButton}
                type="button"
                disabled={isSkipped || episodeNumber <= 0 || !hasSelectedGroups}
                onClick={() => onApplyFansubGroupToEpisode(episodeNumber, selectedFansubGroups)}
              >
                Episode
              </button>
              <button
                className={styles.releaseScopeButton}
                type="button"
                disabled={isSkipped || episodeNumber <= 0 || !hasSelectedGroups}
                onClick={() => onApplyFansubGroupFromEpisode(episodeNumber, selectedFansubGroups)}
              >
                Ab hier
              </button>
            </div>
          </label>
          <label className={styles.releaseMeta}>
            <span className={styles.releaseMetaLabel}>Version</span>
            <input
              className={styles.releaseMetaInput}
              value={row.release_version ?? ''}
              disabled={isSkipped}
              placeholder="z.B. v2"
              aria-label={`Release-Version fuer ${label}`}
              onChange={(event) => onSetRelease(row.media_item_id, { releaseVersion: event.target.value })}
            />
          </label>
        </div>
      </div>
      <span className={`${styles.statusPill} ${styles[row.status]}`}>{statusLabel(row.status)}</span>
      <input
        className={styles.targetInput}
        defaultValue={(row.target_episode_numbers ?? []).join(',')}
        disabled={isSkipped}
        onBlur={(event) => onSetTargets(row.media_item_id, event.target.value)}
        aria-label={`Ziel-Episoden fuer ${label}`}
        placeholder="z.B. 1"
      />
      <button
        className={`${styles.microButton} ${isSkipped ? styles.microButtonActive : ''}`}
        type="button"
        onClick={() => onSkip(row.media_item_id)}
      >
        {isSkipped ? 'Reaktivieren' : 'Ueberspringen'}
      </button>
    </div>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'suggested':
      return 'Vorschlag'
    case 'confirmed':
      return 'Bestaetigt'
    case 'conflict':
      return 'Konflikt'
    case 'skipped':
      return 'Uebersprungen'
    default:
      return status
  }
}
