'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'

import {
  ApiError,
  getAdminFansubAnime,
  getAnimeFansubProjectNote,
  upsertAnimeFansubProjectNote,
} from '@/lib/api'
import type { AnimeFansubProjectNote, UpsertAnimeFansubProjectNoteRequest } from '@/types/fansubNotes'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

const ANIME_PROJECT_NOTE_PLACEHOLDER = `Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime.
Mögliche Fragen als Hilfe: Wie war dieses Fansubprojekt? Warum hat die Gruppe diesen Anime gemacht?
Was war besonders? Wie lief die Arbeit? Gab es Coop? Gab es Re-Releases? Gab es Probleme/Abbrüche?
Welche Rollen waren besonders wichtig? Schöne/schwierige Erinnerungen?`

type NoteVisibility = 'public' | 'internal'
type NoteStatus = 'draft' | 'published' | 'archived' | 'deleted'

interface AnimeEntry {
  id: number
  title: string
}

interface NoteFormState {
  title: string
  bodyMarkdown: string
  visibility: NoteVisibility
  status: NoteStatus
}

const emptyNoteForm = (): NoteFormState => ({
  title: '',
  bodyMarkdown: '',
  visibility: 'internal',
  status: 'draft',
})

function noteToForm(note: AnimeFansubProjectNote): NoteFormState {
  return {
    title: note.title ?? '',
    bodyMarkdown: note.bodyMarkdown ?? '',
    visibility: note.visibility,
    status: note.status,
  }
}

interface AnimeProjectNoteFormProps {
  fansubId: number
  anime: AnimeEntry
  authToken: string | null
}

function AnimeProjectNoteForm({ fansubId, anime, authToken }: AnimeProjectNoteFormProps) {
  const [form, setForm] = useState<NoteFormState>(emptyNoteForm())
  const [noteId, setNoteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  useEffect(() => {
    if (!authToken) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setLoadError(null)

    getAnimeFansubProjectNote(fansubId, anime.id, authToken)
      .then((note) => {
        if (!active) return
        if (note) {
          setNoteId(note.id)
          setForm(noteToForm(note))
        } else {
          setNoteId(null)
          setForm(emptyNoteForm())
        }
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
  }, [fansubId, anime.id, authToken])

  async function handleSave() {
    if (!authToken) return

    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    const payload: UpsertAnimeFansubProjectNoteRequest = {
      title: form.title.trim() || undefined,
      bodyMarkdown: form.bodyMarkdown,
      visibility: form.visibility,
      status: form.status,
    }

    try {
      const saved = await upsertAnimeFansubProjectNote(fansubId, anime.id, payload, authToken)
      setNoteId(saved.id)
      setForm(noteToForm(saved))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : 'Fehler beim Speichern des Projekttexts.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className={styles.fansubEditReleaseState}>Projekttext wird geladen...</div>
  }

  if (loadError) {
    return <div className={styles.errorBox}>{loadError}</div>
  }

  return (
    <div className={styles.fansubEditAnimeProjectNoteForm}>
      <div className={styles.field}>
        <label htmlFor={`note-title-${anime.id}`}>Titel <span className={styles.fansubEditHint}>(optional)</span></label>
        <input
          id={`note-title-${anime.id}`}
          type="text"
          value={form.title}
          onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
          placeholder="Titel des Projekttexts (optional)"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor={`note-body-${anime.id}`}>Projekttext</label>
        <textarea
          id={`note-body-${anime.id}`}
          className={styles.fansubEditMarkdownTextarea}
          value={form.bodyMarkdown}
          onChange={(e) => setForm((c) => ({ ...c, bodyMarkdown: e.target.value }))}
          placeholder={ANIME_PROJECT_NOTE_PLACEHOLDER}
          rows={8}
        />
      </div>

      <div className={styles.responsiveFieldGrid}>
        <div className={styles.field}>
          <label htmlFor={`note-visibility-${anime.id}`}>Sichtbarkeit</label>
          <select
            id={`note-visibility-${anime.id}`}
            value={form.visibility}
            onChange={(e) => setForm((c) => ({ ...c, visibility: e.target.value as NoteVisibility }))}
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
            onChange={(e) => setForm((c) => ({ ...c, status: e.target.value as NoteStatus }))}
          >
            <option value="draft">Entwurf</option>
            <option value="published">Veröffentlicht</option>
            <option value="archived">Archiviert</option>
            <option value="deleted">Gelöscht</option>
          </select>
        </div>
      </div>

      {saveError ? <div className={styles.errorBox}>{saveError}</div> : null}
      {saveSuccess ? <div className={styles.fansubEditSaveSuccess}>Projekttext gespeichert.</div> : null}
      {noteId !== null ? <p className={styles.fansubEditHint}>Gespeicherter Eintrag (ID: {noteId})</p> : null}

      <div className={styles.fansubEditAnimeProjectNoteActions}>
        <button
          type="button"
          className={styles.button}
          onClick={() => void handleSave()}
          disabled={saving || !authToken}
        >
          <Save size={14} />
          {saving ? 'Speichern...' : 'Speichern'}
        </button>
      </div>
    </div>
  )
}

interface AnimeProjectNotesSectionProps {
  fansubId: number
  authToken: string | null
  // Optional: Wenn bereits geladen, als Props übergeben (vermeidet doppelten API-Aufruf)
  animes?: AnimeEntry[]
}

export function AnimeProjectNotesSection({ fansubId, authToken, animes: animesProp }: AnimeProjectNotesSectionProps) {
  const [animes, setAnimes] = useState<AnimeEntry[]>(animesProp ?? [])
  const [loading, setLoading] = useState(!animesProp)
  const [error, setError] = useState<string | null>(null)
  const [expandedAnimeIds, setExpandedAnimeIds] = useState<Set<number>>(() => new Set())

  useEffect(() => {
    if (animesProp !== undefined) {
      setAnimes(animesProp)
      setLoading(false)
      return
    }

    if (!authToken) {
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    setError(null)

    getAdminFansubAnime(fansubId, authToken)
      .then((response) => {
        if (!active) return
        setAnimes(response.data.map((a) => ({ id: a.id, title: a.title })))
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
  }, [fansubId, authToken, animesProp])

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

        {!authToken ? (
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
                  <div className={styles.fansubEditAnimeProjectNotesCardHeader}>
                    <h3 className={styles.fansubEditAnimeProjectNotesTitle}>
                      Projekttext für {anime.title}
                    </h3>
                    <button
                      type="button"
                      className={styles.fansubEditAnimeToggle}
                      onClick={() => toggleAnime(anime.id)}
                      aria-expanded={expanded}
                      aria-label={expanded ? `${anime.title} einklappen` : `${anime.title} ausklappen`}
                    >
                      {expanded ? '▲' : '▼'}
                    </button>
                  </div>
                  {expanded ? (
                    <div className={styles.fansubEditAnimeProjectNotesCardBody}>
                      <AnimeProjectNoteForm
                        fansubId={fansubId}
                        anime={anime}
                        authToken={authToken}
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
