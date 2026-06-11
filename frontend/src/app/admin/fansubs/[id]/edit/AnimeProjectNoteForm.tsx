'use client'

import { useState } from 'react'
import { Save } from 'lucide-react'

import { RichTextEditor } from '@/components/editor'
import { Button, FormField, Select } from '@/components/ui'
import { ApiError, upsertAnimeFansubProjectNote } from '@/lib/api'
import type { AnimeFansubProjectNote, UpsertAnimeFansubProjectNoteRequest } from '@/types/fansubNotes'

import sharedStyles from '../../../admin.module.css'
import editorScaffoldStyles from '../../../../../components/editor/EditorScaffold.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles, ...editorScaffoldStyles }

export const ANIME_PROJECT_NOTE_PLACEHOLDER = `Beschreibe hier das Fansubprojekt dieser Gruppe zu diesem Anime.
Mögliche Fragen als Hilfe: Wie war dieses Fansubprojekt? Warum hat die Gruppe diesen Anime gemacht?
Was war besonders? Wie lief die Arbeit? Gab es Coop? Gab es Re-Releases? Gab es Probleme/Abbrüche?
Welche Rollen waren besonders wichtig? Schöne/schwierige Erinnerungen?`

export const EMPTY_RICH_TEXT_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} as const

export type NoteVisibility = 'public' | 'internal'
export type NoteStatus = 'draft' | 'published' | 'archived' | 'deleted'

export interface AnimeEntry {
  id: number
  title: string
}

export interface NoteFormState {
  title: string
  bodyJson: unknown | null
  visibility: NoteVisibility
  status: NoteStatus
}

export const emptyNoteForm = (): NoteFormState => ({
  title: '',
  bodyJson: null,
  visibility: 'internal',
  status: 'draft',
})

export function ensureRichTextValue(value: unknown | null): unknown {
  return value ?? EMPTY_RICH_TEXT_DOC
}

export function noteVisibilityLabel(value: NoteVisibility): string {
  return value === 'public' ? 'Öffentlich' : 'Intern'
}

export function noteStatusLabel(value: NoteStatus): string {
  if (value === 'draft') return 'Entwurf'
  if (value === 'published') return 'Veröffentlicht'
  if (value === 'archived') return 'Archiviert'
  return 'Gelöscht'
}

export function noteToForm(note: AnimeFansubProjectNote): NoteFormState {
  return {
    title: note.title ?? '',
    bodyJson: note.bodyJson ?? null,
    visibility: note.visibility,
    status: note.status,
  }
}

export interface AnimeProjectNoteFormProps {
  fansubId: number
  anime: AnimeEntry
  hasAccessToken: boolean
  initialNote: AnimeFansubProjectNote | null
  onSaved: (note: AnimeFansubProjectNote) => void
}

export function AnimeProjectNoteForm({ fansubId, anime, hasAccessToken, initialNote, onSaved }: AnimeProjectNoteFormProps) {
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
          <FormField label="Sichtbarkeit">
            <Select
              value={form.visibility}
              onChange={(e) => setForm((current) => ({ ...current, visibility: e.target.value as NoteVisibility }))}
            >
              <option value="internal">Intern</option>
              <option value="public">Öffentlich</option>
            </Select>
          </FormField>

          <FormField label="Status">
            <Select
              value={form.status}
              onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as NoteStatus }))}
            >
              <option value="draft">Entwurf</option>
              <option value="published">Veröffentlicht</option>
              <option value="archived">Archiviert</option>
              <option value="deleted">Gelöscht</option>
            </Select>
          </FormField>
        </div>
      </div>

      {saveError ? <div className={styles.errorBox}>{saveError}</div> : null}

      <div className={styles.editorActionBar}>
        <div className={styles.editorActionMeta} />
        <Button
          type="button"
          variant="success"
          className={styles.editorPrimaryAction}
          leftIcon={<Save size={14} />}
          onClick={() => void handleSave()}
          disabled={saving || !hasAccessToken}
        >
          {saving ? 'Speichern...' : 'Speichern'}
        </Button>
      </div>
    </section>
  )
}
