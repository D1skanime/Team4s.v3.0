'use client'

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'

import { Button, FormField, Input } from '@/components/ui'
import { getFansubList } from '@/lib/api'
import type { EpisodeImportMappingRow, EpisodeImportSelectedFansubGroup } from '@/types/episodeImport'
import type { FansubGroup } from '@/types/fansub'

import { resolveFansubGroupChipDisplay } from './episodeImportMapping'
import { FansubGroupOriginHint } from './FansubGroupOriginHint'
import styles from './page.module.css'

const FREE_TEXT_GROUP_SEPARATOR = /[,;\n]+/

interface EpisodeImportMappingRowGroupFieldProps {
  row: EpisodeImportMappingRow
  sourceKey: string
  label: string
  episodeNumber: number
  isSkipped: boolean
  selectedFansubGroups: EpisodeImportSelectedFansubGroup[]
  onSetSelectedFansubGroups: (sourceKey: string, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
  onAddSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onRemoveSelectedFansubGroup: (sourceKey: string, fansubGroup: EpisodeImportSelectedFansubGroup) => void
  onApplyFansubGroupFromEpisode: (episodeNumber: number, fansubGroups: EpisodeImportSelectedFansubGroup[]) => void
}

/**
 * Extracted "Gruppe" field (chips, search, suggestions, scope actions) for one
 * mapping row (GAP-09, 167-UAT.md). Built exclusively from @/components/ui
 * primitives so EpisodeImportMappingRow.tsx stays a thin three-column layout
 * shell instead of growing into a single unstructured container.
 */
export function EpisodeImportMappingRowGroupField({
  row,
  sourceKey,
  label,
  episodeNumber,
  isSkipped,
  selectedFansubGroups,
  onSetSelectedFansubGroups,
  onAddSelectedFansubGroup,
  onRemoveSelectedFansubGroup,
  onApplyFansubGroupFromEpisode,
}: EpisodeImportMappingRowGroupFieldProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FansubGroup[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchMessage, setSearchMessage] = useState<string | null>(null)

  const hasSelectedGroups = selectedFansubGroups.length > 0

  const selectedGroupKeys = useMemo(
    () =>
      Array.from(
        new Set(
          selectedFansubGroups.map((group) =>
            typeof group.id === 'number' && Number.isFinite(group.id)
              ? `id:${group.id}`
              : `name:${(group.name ?? group.slug ?? '').trim().toLowerCase()}`,
          ),
        ),
      ).sort(),
    [selectedFansubGroups],
  )

  useEffect(() => {
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }, [sourceKey, row.status])

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
          return !selectedGroupKeys.includes(`id:${group.id}`)
        })
        setResults(nextResults)
        if (nextResults.length === 0) {
          setSearchMessage('Keine bestehende Gruppe gefunden. Neue Eingabe kann als Chip hinzugefügt werden.')
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

  function handleAddFreeTextChips() {
    const nextGroups = query
      .split(FREE_TEXT_GROUP_SEPARATOR)
      .map((value) => value.trim())
      .filter(Boolean)
      .map((name) => ({ name }))

    if (nextGroups.length === 0) {
      return
    }

    onSetSelectedFansubGroups(sourceKey, [
      ...selectedFansubGroups,
      ...nextGroups,
    ])
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }

  function handleSelectExistingGroup(group: FansubGroup) {
    onAddSelectedFansubGroup(sourceKey, { id: group.id, name: group.name, slug: group.slug })
    setQuery('')
    setResults([])
    setSearchMessage(null)
  }

  function handleGroupInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      handleAddFreeTextChips()
      return
    }

    if (event.key === 'Backspace' && !query.trim() && selectedFansubGroups.length > 0) {
      event.preventDefault()
      const lastGroup = selectedFansubGroups[selectedFansubGroups.length - 1]
      onRemoveSelectedFansubGroup(sourceKey, lastGroup)
    }
  }

  return (
    <FormField>
      <div className={styles.groupSelector}>
        <div className={styles.groupChipWrap}>
          {hasSelectedGroups ? (
            selectedFansubGroups.map((group) => {
              const { label: chipLabel, idTooltip } = resolveFansubGroupChipDisplay(group, row)
              return (
                <Button
                  key={group.id ?? `${group.name ?? group.slug ?? 'group'}-${sourceKey}`}
                  variant="subtle"
                  size="sm"
                  className={styles.groupChip}
                  disabled={isSkipped}
                  title={idTooltip ?? undefined}
                  onClick={() => onRemoveSelectedFansubGroup(sourceKey, group)}
                >
                  <span>{chipLabel}</span>
                  <span className={styles.groupChipRemove}>x</span>
                </Button>
              )
            })
          ) : (
            <span className={styles.groupPlaceholder}>Keine Gruppe gewählt.</span>
          )}
        </div>
        <div className={styles.groupInputRow}>
          <Input
            className={styles.groupSearchInput}
            value={query}
            disabled={isSkipped}
            placeholder="Gruppe suchen oder neu tippen"
            aria-label={`Fansub-Gruppen für ${label}`}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleGroupInputKeyDown}
          />
          <Button
            variant="secondary"
            size="sm"
            disabled={isSkipped || !query.trim()}
            onClick={handleAddFreeTextChips}
          >
            Als Chip
          </Button>
        </div>
        {isSearching ? <p className={styles.groupSearchState}>Suche läuft...</p> : null}
        {!isSearching && searchMessage ? <p className={styles.groupSearchState}>{searchMessage}</p> : null}
        {!isSearching && results.length > 0 ? (
          <div className={styles.groupSearchResults}>
            {results.map((group) => (
              <Button
                key={group.id}
                variant="ghost"
                size="sm"
                fullWidth
                className={styles.groupSearchOption}
                onMouseDown={(event) => {
                  event.preventDefault()
                  handleSelectExistingGroup(group)
                }}
              >
                <span>{group.name}</span>
                <span className={styles.groupSearchMeta}>#{group.id}</span>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
      <FansubGroupOriginHint
        row={row}
        selectedFansubGroups={selectedFansubGroups}
        onAddSelectedFansubGroup={(g) => onAddSelectedFansubGroup(sourceKey, g)}
        sourceKey={sourceKey}
        label={label}
      />
      <div className={styles.groupScopeActions}>
        <Button
          variant="subtle"
          size="sm"
          disabled={isSkipped || episodeNumber <= 0 || !hasSelectedGroups}
          onClick={() => onApplyFansubGroupFromEpisode(episodeNumber, selectedFansubGroups)}
        >
          Ab hier
        </Button>
        <Button
          variant="subtle"
          size="sm"
          disabled={isSkipped || episodeNumber <= 0}
          onClick={() => onApplyFansubGroupFromEpisode(episodeNumber, [])}
        >
          Ab hier entfernen
        </Button>
      </div>
    </FormField>
  )
}
