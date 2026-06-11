'use client'

import { useEffect, useState } from 'react'

import { RichTextEditor, RichTextRenderer } from '@/components/editor'
import { Button, EmptyState, ErrorState, SectionHeader } from '@/components/ui'
import {
  ApiError,
  getAnimeFansubProjectNote,
  upsertAnimeFansubProjectNote,
} from '@/lib/api'
import type { AnimeFansubProjectNote, UpsertAnimeFansubProjectNoteRequest } from '@/types/fansubNotes'

import { ensureRichTextValue } from './AnimeProjectNoteForm'

// Zustandsmaschine: NICHT_GELADEN → LADEN → VORHANDEN | FEHLT | FEHLER
// VORHANDEN → BEARBEITEN; FEHLT → BEARBEITEN; FEHLER → LADEN (Retry)
type NoteLoadState = 'idle' | 'loading' | 'present' | 'missing' | 'editing' | 'error'

type NoteVisibility = 'public' | 'internal'
type NoteStatus = 'draft' | 'published' | 'archived' | 'deleted'

interface NoteFormState {
  bodyJson: unknown | null
  visibility: NoteVisibility
  status: NoteStatus
}

const emptyForm = (): NoteFormState => ({
  bodyJson: null,
  visibility: 'internal',
  status: 'draft',
})

function noteToForm(note: AnimeFansubProjectNote): NoteFormState {
  return {
    bodyJson: note.bodyJson ?? null,
    visibility: note.visibility,
    status: note.status,
  }
}

type Props = {
  fansubId: number
  animeId: number
  expanded: boolean // lazy load trigger (D-12)
}

export function AnimeProjectNoteWorkspace({ fansubId, animeId, expanded }: Props) {
  const [noteState, setNoteState] = useState<NoteLoadState>('idle')
  const [note, setNote] = useState<AnimeFansubProjectNote | null>(null)
  const [form, setForm] = useState<NoteFormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Lazy-Load-Effect: lädt erst wenn aufgeklappt (D-12)
  useEffect(() => {
    if (!expanded || noteState !== 'idle') return
    let cancelled = false
    setNoteState('loading')
    getAnimeFansubProjectNote(fansubId, animeId)
      .then((n) => {
        if (!cancelled) {
          setNote(n)
          setNoteState(n ? 'present' : 'missing')
        }
      })
      .catch(() => {
        if (!cancelled) setNoteState('error')
      })
    return () => {
      cancelled = true
    }
  }, [expanded, fansubId, animeId, noteState])

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const payload: UpsertAnimeFansubProjectNoteRequest = {
      bodyJson: ensureRichTextValue(form.bodyJson),
      visibility: form.visibility,
      status: form.status,
    }
    try {
      const saved = await upsertAnimeFansubProjectNote(fansubId, animeId, payload)
      setNote(saved)
      setNoteState('present')
    } catch (err: unknown) {
      setSaveError(err instanceof ApiError ? err.message : 'Fehler beim Speichern des Einblicks.')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit() {
    if (note) setForm(noteToForm(note))
    else setForm(emptyForm())
    setNoteState('editing')
  }

  function handleCancel() {
    setSaveError(null)
    setNoteState(note ? 'present' : 'missing')
  }

  // Nicht geladen / Lädt
  if (noteState === 'idle' || noteState === 'loading') {
    return (
      <div>
        <SectionHeader title="Projekt-Einblick" />
        <p>Wird geladen…</p>
      </div>
    )
  }

  // Fehler beim Laden
  if (noteState === 'error') {
    return (
      <div>
        <SectionHeader title="Projekt-Einblick" />
        <ErrorState
          title="Einblick konnte nicht geladen werden"
          description="Einblick konnte nicht geladen werden. Seite neu laden oder später erneut versuchen."
          action={
            <Button variant="ghost" size="sm" onClick={() => setNoteState('idle')}>
              Erneut versuchen
            </Button>
          }
        />
      </div>
    )
  }

  // Kein Einblick vorhanden
  if (noteState === 'missing') {
    return (
      <div>
        <SectionHeader title="Projekt-Einblick" />
        <EmptyState
          title="Projekt-Einblick fehlt"
          description="Noch kein Einblick für dieses Projekt vorhanden."
          action={
            <Button variant="primary" size="sm" onClick={handleEdit}>
              Einblick hinzufügen
            </Button>
          }
        />
      </div>
    )
  }

  // Einblick vorhanden (Leseansicht)
  if (noteState === 'present' && note) {
    return (
      <div>
        <SectionHeader
          title="Projekt-Einblick"
          actions={
            <Button variant="ghost" size="sm" onClick={handleEdit}>
              Einblick bearbeiten
            </Button>
          }
        />
        <RichTextRenderer bodyHtml={note.bodyHtml} />
      </div>
    )
  }

  // Bearbeiten
  return (
    <div>
      <SectionHeader title="Projekt-Einblick" />
      <RichTextEditor
        value={ensureRichTextValue(form.bodyJson)}
        onChange={(next) => setForm((c) => ({ ...c, bodyJson: next }))}
        placeholder="Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime."
        mode="longform"
        minHeight={200}
      />
      {saveError ? <p style={{ color: 'var(--color-error)', marginTop: '0.5rem' }}>{saveError}</p> : null}
      <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)' }}>
        <Button variant="primary" size="sm" onClick={() => void handleSave()} disabled={saving}>
          {saving ? 'Speichern…' : 'Einblick speichern'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
          Abbrechen
        </Button>
      </div>
    </div>
  )
}

export default AnimeProjectNoteWorkspace
