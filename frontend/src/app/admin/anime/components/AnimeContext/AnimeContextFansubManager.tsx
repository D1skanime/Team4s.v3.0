import { FormEvent, useMemo, useState } from 'react'

import { ApiError, attachAnimeFansub, detachAnimeFansub, getFansubList } from '@/lib/api'
import { FansubGroup } from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import contextStyles from './AnimeContext.module.css'

const styles = { ...sharedStyles, ...contextStyles }

interface AnimeContextFansubManagerProps {
  animeID: number
  authToken: string
  attachedFansubs: FansubGroup[]
  disabled: boolean
  onChanged: () => Promise<void>
  onSuccess: (message: string) => void
  onError: (message: string) => void
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return `(${error.status}) ${error.message}`
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }
  return fallback
}

export function AnimeContextFansubManager({
  animeID,
  authToken,
  attachedFansubs,
  disabled,
  onChanged,
  onSuccess,
  onError,
}: AnimeContextFansubManagerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FansubGroup[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isMutating, setIsMutating] = useState(false)
  const [mutatingGroupID, setMutatingGroupID] = useState<number | null>(null)

  const attachedIDs = useMemo(() => new Set(attachedFansubs.map((group) => group.id)), [attachedFansubs])
  const visibleResults = useMemo(
    () => results.filter((group) => !attachedIDs.has(group.id)),
    [attachedIDs, results],
  )

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedQuery = query.trim()
    if (trimmedQuery.length < 2) {
      setResults([])
      onError('Bitte mindestens 2 Zeichen fuer die Gruppensuche eingeben.')
      return
    }

    setIsSearching(true)
    try {
      const response = await getFansubList({ q: trimmedQuery, page: 1, per_page: 12 })
      setResults(response.data)
      if (response.data.length === 0) {
        onSuccess('Keine passende Fansub-Gruppe gefunden.')
      }
    } catch (error) {
      onError(formatError(error, 'Fansub-Suche fehlgeschlagen.'))
    } finally {
      setIsSearching(false)
    }
  }

  const handleAttach = async (group: FansubGroup) => {
    if (!authToken.trim()) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    setIsMutating(true)
    setMutatingGroupID(group.id)
    try {
      await attachAnimeFansub(animeID, group.id, authToken)
      await onChanged()
      setResults((current) => current.filter((item) => item.id !== group.id))
      onSuccess(`Fansub "${group.name}" wurde mit Anime #${animeID} verknuepft.`)
    } catch (error) {
      onError(formatError(error, 'Fansub-Verknuepfung fehlgeschlagen.'))
    } finally {
      setIsMutating(false)
      setMutatingGroupID(null)
    }
  }

  const handleDetach = async (group: FansubGroup) => {
    if (!authToken.trim()) {
      onError('Anmeldung erforderlich. Bitte zuerst auf /auth ein gueltiges Token erstellen.')
      return
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        `Fansub "${group.name}" vom Anime entfernen?\n\nVersions-Zuordnungen bleiben erhalten, aber die Gruppe ist nicht mehr als Anime-Verknuepfung gelistet.`,
      )
      if (!confirmed) return
    }

    setIsMutating(true)
    setMutatingGroupID(group.id)
    try {
      await detachAnimeFansub(animeID, group.id, authToken)
      await onChanged()
      onSuccess(`Fansub "${group.name}" wurde vom Anime entfernt.`)
    } catch (error) {
      onError(formatError(error, 'Fansub konnte nicht entfernt werden.'))
    } finally {
      setIsMutating(false)
      setMutatingGroupID(null)
    }
  }

  return (
    <div className={styles.contextFansubManager}>
      <div className={styles.contextFansubManagerHeader}>
        <p className={styles.contextTitle}>Gruppen manuell verwalten</p>
        <p className={styles.hint}>
          Mehrere Gruppen pro Folge laufen im aktuellen Modell ueber eine Kollaboration-Gruppe. Diese Gruppe wird dann
          der Version zugewiesen.
        </p>
      </div>

      <form className={styles.contextFansubManagerForm} onSubmit={handleSearch}>
        <div className={styles.field}>
          <label htmlFor="anime-fansub-search">Bestehende Gruppe suchen</label>
          <input
            id="anime-fansub-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            disabled={disabled || isSearching || isMutating}
            placeholder="Name, Slug oder Alias"
          />
        </div>
        <div className={styles.actions}>
          <button className={styles.buttonSecondary} type="submit" disabled={disabled || isSearching || isMutating}>
            {isSearching ? 'Suche...' : 'Suche'}
          </button>
        </div>
      </form>

      {visibleResults.length > 0 ? (
        <div className={styles.contextFansubGrid}>
          {visibleResults.map((group) => (
            <article key={group.id} className={styles.contextFansubCard}>
              <p className={styles.contextFansubTitle}>
                {group.name}
                <span className={styles.contextFansubMeta}>#{group.id}</span>
              </p>
              <p className={styles.hint}>
                Typ: {group.group_type === 'collaboration' ? 'Kollaboration' : 'Gruppe'} | Slug: {group.slug}
              </p>
              <div className={styles.actions}>
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={disabled || isMutating}
                  onClick={() => {
                    void handleAttach(group)
                  }}
                >
                  {mutatingGroupID === group.id ? 'Verknuepfe...' : 'Zum Anime hinzufuegen'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {attachedFansubs.length > 0 ? (
        <div className={styles.contextFansubGrid}>
          {attachedFansubs.map((group) => (
            <article key={group.id} className={styles.contextFansubCard}>
              <p className={styles.contextFansubTitle}>
                {group.name}
                <span className={styles.contextFansubMeta}>#{group.id}</span>
              </p>
              <p className={styles.hint}>
                Typ: {group.group_type === 'collaboration' ? 'Kollaboration' : 'Gruppe'} | Verknuepft mit diesem Anime
              </p>
              {group.group_type === 'collaboration' && group.collaboration_members && group.collaboration_members.length > 0 ? (
                <p className={styles.contextDescription}>
                  Beteiligte Gruppen: {group.collaboration_members.map((member) => member.name).join(', ')}
                </p>
              ) : null}
              <div className={styles.actions}>
                <button
                  className={styles.buttonSecondary}
                  type="button"
                  disabled={disabled || isMutating}
                  onClick={() => {
                    void handleDetach(group)
                  }}
                >
                  {mutatingGroupID === group.id ? 'Entferne...' : 'Vom Anime entfernen'}
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </div>
  )
}
