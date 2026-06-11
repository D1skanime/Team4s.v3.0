'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Trash2 } from 'lucide-react'

import { RichTextRenderer } from '@/components/editor'
import { Button } from '@/components/ui'
import {
  ApiError,
  deleteAnimeFansubProjectNote,
  getAdminFansubAnime,
  getAnimeFansubProjectNote,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { AnimeFansubProjectNote } from '@/types/fansubNotes'

import sharedStyles from '../../../admin.module.css'
import editorScaffoldStyles from '../../../../../components/editor/EditorScaffold.module.css'
import fansubEditStyles from './FansubEdit.module.css'

import {
  AnimeProjectNoteForm,
  noteVisibilityLabel,
  noteStatusLabel,
} from './AnimeProjectNoteForm'
import type { AnimeEntry } from './AnimeProjectNoteForm'

const styles = { ...sharedStyles, ...fansubEditStyles, ...editorScaffoldStyles }

function previewText(value?: string | null): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Noch kein Projekttext vorhanden.'
  return normalized.length > 240 ? `${normalized.slice(0, 240).trimEnd()}...` : normalized
}

interface AnimeProjectNotePreviewProps {
  anime: AnimeEntry
  note: AnimeFansubProjectNote
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}

function AnimeProjectNotePreview({ anime, note, deleting, onEdit, onDelete }: AnimeProjectNotePreviewProps) {
  return (
    <section className={styles.editorCard}>
      <div className={styles.editorCardHeader}>
        <div className={styles.editorCardHeading}>
          <p className={styles.editorEyebrow}>Anime-Projekttext</p>
          <h3 className={styles.editorTitle}>{note.title?.trim() || `Projekttext für ${anime.title}`}</h3>
        </div>
        <div className={styles.editorBadgeRow}>
          <span className={styles.editorBadge}>{noteVisibilityLabel(note.visibility)}</span>
          <span className={styles.editorBadge}>{noteStatusLabel(note.status)}</span>
        </div>
      </div>

      {note.bodyHtml?.trim() ? (
        <RichTextRenderer bodyHtml={note.bodyHtml} />
      ) : (
        <p className={styles.editorPreviewText}>{previewText(note.bodyText)}</p>
      )}

      <div className={styles.editorActionBar}>
        <Button variant="ghost" size="sm" onClick={onEdit} disabled={deleting}>
          <Pencil size={14} />Bearbeiten
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
          <Trash2 size={14} />{deleting ? 'Löschen...' : 'Löschen'}
        </Button>
      </div>
    </section>
  )
}

interface AnimeProjectNoteWorkspaceProps {
  fansubId: number
  anime: AnimeEntry
  hasAccessToken: boolean
}

function AnimeProjectNoteWorkspace({ fansubId, anime, hasAccessToken }: AnimeProjectNoteWorkspaceProps) {
  const [note, setNote] = useState<AnimeFansubProjectNote | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!hasAccessToken) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setLoadError(null)
    setDeleteError(null)

    getAnimeFansubProjectNote(fansubId, anime.id)
      .then((loadedNote) => {
        if (!active) return
        setNote(loadedNote)
        setIsEditing(loadedNote === null)
      })
      .catch((err: unknown) => {
        if (!active) return
        setLoadError(err instanceof ApiError ? err.message : 'Fehler beim Laden des Projekttexts.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fansubId, anime.id, hasAccessToken])

  async function handleDelete() {
    if (!hasAccessToken || !note) return

    setDeleting(true)
    setDeleteError(null)

    try {
      await deleteAnimeFansubProjectNote(fansubId, anime.id, note.id)
      setNote(null)
      setIsEditing(true)
    } catch (err: unknown) {
      setDeleteError(err instanceof ApiError ? err.message : 'Fehler beim Löschen des Projekttexts.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className={styles.fansubEditReleaseState}>Projekttext wird geladen...</div>
  }

  if (loadError) {
    return <div className={styles.errorBox}>{loadError}</div>
  }

  return (
    <>
      {deleteError ? <div className={styles.errorBox}>{deleteError}</div> : null}

      {note && !isEditing ? (
        <AnimeProjectNotePreview
          anime={anime}
          note={note}
          deleting={deleting}
          onEdit={() => setIsEditing(true)}
          onDelete={() => { void handleDelete() }}
        />
      ) : (
        <AnimeProjectNoteForm
          fansubId={fansubId}
          anime={anime}
          hasAccessToken={hasAccessToken}
          initialNote={note}
          onSaved={(saved) => {
            setNote(saved)
            setIsEditing(false)
          }}
        />
      )}
    </>
  )
}

interface AnimeProjectNotesSectionBodyProps {
  fansubId: number
  hasAccessToken: boolean
  animes: AnimeEntry[]
  loading: boolean
  error: string | null
}

function AnimeProjectNotesSectionBody({
  fansubId,
  hasAccessToken,
  animes,
  loading,
  error,
}: AnimeProjectNotesSectionBodyProps) {
  const [expandedAnimeIds, setExpandedAnimeIds] = useState<Set<number>>(() => new Set())

  function toggleAnime(animeId: number) {
    setExpandedAnimeIds((prev) => {
      const next = new Set(prev)
      if (next.has(animeId)) {
        next.delete(animeId)
      } else {
        next.add(animeId)
      }
      return next
    })
  }

  return (
    <details className={styles.fansubEditSection} open>
      <summary className={styles.fansubEditSectionSummary}>Anime-Projekttexte</summary>
      <div className={styles.fansubEditSectionBody}>
        <p className={styles.fansubEditHint}>
          Projekttexte dieser Fansubgruppe zu ihren Anime. Pro Anime kann ein beschreibender Text gespeichert werden.
        </p>

        {!hasAccessToken ? (
          <div className={styles.errorBox}>Anmeldung erforderlich. Bitte zuerst ein gültiges Token erstellen.</div>
        ) : null}

        {loading ? (
          <div className={styles.fansubEditReleaseState}>Anime-Zuordnungen werden geladen...</div>
        ) : null}

        {error ? <div className={styles.errorBox}>{error}</div> : null}

        {!loading && !error && animes.length === 0 ? (
          <div className={styles.fansubEditReleaseState}>
            Diese Gruppe hat noch keine Anime-Zuordnungen.
          </div>
        ) : null}

        {!loading && !error && animes.length > 0 ? (
          <div className={styles.fansubEditAnimeProjectNotesList}>
            {animes.map((anime) => {
              const expanded = expandedAnimeIds.has(anime.id)
              return (
                <article key={anime.id} className={styles.fansubEditAnimeProjectNotesCard}>
                  <Button
                    variant="ghost"
                    className={styles.fansubEditAnimeProjectNotesHeaderButton}
                    onClick={() => toggleAnime(anime.id)}
                    aria-expanded={expanded}
                    aria-label={expanded ? `${anime.title} einklappen` : `${anime.title} ausklappen`}
                  >
                    <div className={styles.fansubEditAnimeProjectNotesBody}>
                      <p className={styles.fansubEditAnimeProjectNotesEyebrow}>Anime-Projekttext</p>
                      <h3 className={styles.fansubEditAnimeProjectNotesTitle}>
                        Projekttext für {anime.title}
                      </h3>
                      <p className={styles.fansubEditAnimeProjectNotesHint}>
                        Eintrag öffnen, um den Projekttext, Status und die Sichtbarkeit für diesen Anime zu pflegen.
                      </p>
                    </div>
                    <div className={styles.fansubEditAnimeProjectNotesMeta}>
                      <span>1 Editor</span>
                      <span className={styles.fansubEditAnimeToggle} aria-hidden="true">
                        {expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                      </span>
                    </div>
                  </Button>
                  {expanded ? (
                    <div className={styles.fansubEditAnimeProjectNotesCardBody}>
                      <AnimeProjectNoteWorkspace
                        fansubId={fansubId}
                        anime={anime}
                        hasAccessToken={hasAccessToken}
                      />
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : null}
      </div>
    </details>
  )
}

interface AnimeProjectNotesSectionRemoteProps {
  fansubId: number
  hasAccessToken: boolean
}

function AnimeProjectNotesSectionRemote({ fansubId, hasAccessToken }: AnimeProjectNotesSectionRemoteProps) {
  const [animes, setAnimes] = useState<AnimeEntry[]>([])
  const [loading, setLoading] = useState(hasAccessToken)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!hasAccessToken) {
      return
    }

    let active = true

    getAdminFansubAnime(fansubId)
      .then((response) => {
        if (!active) return
        setAnimes(response.data.map((anime) => ({ id: anime.id, title: anime.title })))
      })
      .catch((err: unknown) => {
        if (!active) return
        setError(err instanceof ApiError ? err.message : 'Fehler beim Laden der Anime-Zuordnungen.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [fansubId, hasAccessToken])

  return (
    <AnimeProjectNotesSectionBody
      fansubId={fansubId}
      hasAccessToken={hasAccessToken}
      animes={animes}
      loading={hasAccessToken ? loading : false}
      error={error}
    />
  )
}

interface AnimeProjectNotesSectionProps {
  fansubId: number
  hasAccessToken?: boolean
  animes?: AnimeEntry[]
  [legacyProp: string]: unknown
}

export function AnimeProjectNotesSection({ fansubId, hasAccessToken = false, animes }: AnimeProjectNotesSectionProps) {
  const { hasAccessToken: runtimeHasAccessToken, isClientInitialized } = useAuthSession()
  const effectiveHasAccessToken = hasAccessToken || (isClientInitialized && runtimeHasAccessToken)

  if (animes !== undefined) {
    return (
      <AnimeProjectNotesSectionBody
        fansubId={fansubId}
        hasAccessToken={effectiveHasAccessToken}
        animes={animes}
        loading={false}
        error={null}
      />
    )
  }

  return <AnimeProjectNotesSectionRemote fansubId={fansubId} hasAccessToken={effectiveHasAccessToken} />
}
