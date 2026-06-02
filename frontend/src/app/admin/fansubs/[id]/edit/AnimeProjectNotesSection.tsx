'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Save, Trash2 } from 'lucide-react'

import { RichTextEditor, RichTextRenderer } from '@/components/editor'
import {
  ApiError,
  deleteAnimeFansubProjectNote,
  getAdminFansubAnime,
  getAnimeFansubProjectNote,
  upsertAnimeFansubProjectNote,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import type { AnimeFansubProjectNote, UpsertAnimeFansubProjectNoteRequest } from '@/types/fansubNotes'

import sharedStyles from '../../../admin.module.css'
import editorScaffoldStyles from '../../../../../components/editor/EditorScaffold.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles, ...editorScaffoldStyles }

const ANIME_PROJECT_NOTE_PLACEHOLDER = `Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime.
Mögliche Fragen als Hilfe: Wie war dieses Fansubprojekt? Warum hat die Gruppe diesen Anime gemacht?
Was war besonders? Wie lief die Arbeit? Gab es Coop? Gab es Re-Releases? Gab es Probleme/Abbrüche?
Welche Rollen waren besonders wichtig? Schöne/schwierige Erinnerungen?`

const EMPTY_RICH_TEXT_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} as const

type NoteVisibility = 'public' | 'internal'
type NoteStatus = 'draft' | 'published' | 'archived' | 'deleted'

interface AnimeEntry {
  id: number
  title: string
}

interface NoteFormState {
  title: string
  bodyJson: unknown | null
  visibility: NoteVisibility
  status: NoteStatus
}

const emptyNoteForm = (): NoteFormState => ({
  title: '',
  bodyJson: null,
  visibility: 'internal',
  status: 'draft',
})

function ensureRichTextValue(value: unknown | null): unknown {
  return value ?? EMPTY_RICH_TEXT_DOC
}

function noteVisibilityLabel(value: NoteVisibility): string {
  return value === 'public' ? 'Öffentlich' : 'Intern'
}

function noteStatusLabel(value: NoteStatus): string {
  if (value === 'draft') return 'Entwurf'
  if (value === 'published') return 'Veröffentlicht'
  if (value === 'archived') return 'Archiviert'
  return 'Gelöscht'
}

function previewText(value?: string | null): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Noch kein Projekttext vorhanden.'
  return normalized.length > 240 ? `${normalized.slice(0, 240).trimEnd()}...` : normalized
}

function noteToForm(note: AnimeFansubProjectNote): NoteFormState {
  return {
    title: note.title ?? '',
    bodyJson: note.bodyJson ?? null,
    visibility: note.visibility,
    status: note.status,
  }
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
        <button type="button" className={styles.button} onClick={onEdit} disabled={deleting}>
          <Pencil size={14} />Bearbeiten
        </button>
        <button
          type="button"
          className={`${styles.buttonSecondary} ${styles.editorGhostButton}`}
          onClick={onDelete}
          disabled={deleting}
        >
          <Trash2 size={14} />{deleting ? 'Löschen...' : 'Löschen'}
        </button>
      </div>
    </section>
  )
}

interface AnimeProjectNoteFormProps {
  fansubId: number
  anime: AnimeEntry
  hasAccessToken: boolean
  initialNote: AnimeFansubProjectNote | null
  onSaved: (note: AnimeFansubProjectNote) => void
}

function AnimeProjectNoteForm({ fansubId, anime, hasAccessToken, initialNote, onSaved }: AnimeProjectNoteFormProps) {
  const [form, setForm] = useState<NoteFormState>(() => initialNote ? noteToForm(initialNote) : emptyNoteForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleSave() {
    if (!hasAccessToken) return

    setSaving(true)
    setSaveError(null)

    const payload: UpsertAnimeFansubProjectNoteRequest = {
      title: form.title.trim() || undefined,
      bodyJson: ensureRichTextValue(form.bodyJson),
      visibility: form.visibility,
      status: form.status,
    }

    try {
      const saved = await upsertAnimeFansubProjectNote(fansubId, anime.id, payload)
      setForm(noteToForm(saved))
      setSaving(false)
      onSaved(saved)
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : 'Fehler beim Speichern des Projekttexts.')
      setSaving(false)
    }
  }

  return (
    <section className={styles.editorCard}>
      <div className={styles.editorCardHeader}>
        <div className={styles.editorCardHeading}>
          <p className={styles.editorEyebrow}>Anime-Projekttext</p>
          <h3 className={styles.editorTitle}>Projekttext für {anime.title}</h3>
        </div>
        <div className={styles.editorBadgeRow}>
          <span className={styles.editorBadge}>{noteVisibilityLabel(form.visibility)}</span>
          <span className={styles.editorBadge}>{noteStatusLabel(form.status)}</span>
        </div>
      </div>

      <div className={styles.editorMain}>
        <div className={styles.field}>
          <label htmlFor={`note-title-${anime.id}`}>Titel</label>
          <input
            id={`note-title-${anime.id}`}
            type="text"
            value={form.title}
            onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
            placeholder="Titel des Projekttexts (optional)"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor={`note-body-${anime.id}`}>Projekttext</label>
          <RichTextEditor
            value={ensureRichTextValue(form.bodyJson)}
            onChange={(next) => setForm((current) => ({ ...current, bodyJson: next }))}
            placeholder={ANIME_PROJECT_NOTE_PLACEHOLDER}
            mode="longform"
            minHeight={240}
          />
        </div>
      </div>

      <div className={styles.editorMetaCard}>
        <div className={styles.editorMetaHeader}>
          <div>
            <p className={styles.fansubEditorEyebrow}>Optionen</p>
            <h4 className={styles.fansubEditorMetaTitle}>Steuerung für Sichtbarkeit und Status</h4>
          </div>
        </div>

        <div className={styles.editorMetaGrid}>
          <div className={styles.field}>
            <label htmlFor={`note-visibility-${anime.id}`}>Sichtbarkeit</label>
            <select
              id={`note-visibility-${anime.id}`}
              value={form.visibility}
              onChange={(e) => setForm((current) => ({ ...current, visibility: e.target.value as NoteVisibility }))}
            >
              <option value="internal">Intern</option>
              <option value="public">Öffentlich</option>
            </select>
          </div>

          <div className={styles.field}>
            <label htmlFor={`note-status-${anime.id}`}>Status</label>
            <select
              id={`note-status-${anime.id}`}
              value={form.status}
              onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as NoteStatus }))}
            >
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              <option value="archived">Archiviert</option>
              <option value="deleted">Gelöscht</option>
            </select>
          </div>
        </div>
      </div>

      {saveError ? <div className={styles.errorBox}>{saveError}</div> : null}

      <div className={styles.editorActionBar}>
        <div className={styles.editorActionMeta} />
        <button
          type="button"
          className={`${styles.button} ${styles.editorPrimaryAction}`}
          onClick={() => void handleSave()}
          disabled={saving || !hasAccessToken}
        >
          <Save size={14} />
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
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
                  <button
                    type="button"
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
                  </button>
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
