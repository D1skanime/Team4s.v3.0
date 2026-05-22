'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import {
  ApiError,
  createFansubGroupNote,
  deleteFansubGroupNote,
  listFansubGroupNotes,
  updateFansubGroupNote,
} from '@/lib/api'
import { useAuthSession } from '@/lib/useAuthSession'
import {
  CreateFansubGroupNoteRequest,
  FansubGroupNote,
  UpdateFansubGroupNoteRequest,
} from '@/types/fansubNotes'
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import {
  emptyGroupNoteDraft,
  ensureRichTextValue,
  GroupNoteDraft,
  GroupNoteEditor,
  GroupNotePreview,
} from './NotesTab.helpers'

const styles = { ...sharedStyles, ...fansubEditStyles }

function errMessage(error: unknown): string {
  return error instanceof ApiError ? `(${error.status}) ${error.message}` : 'Anfrage fehlgeschlagen.'
}

function normalizeGroupNoteDraft(draft: GroupNoteDraft): GroupNoteDraft {
  return {
    ...draft,
    visibility: draft.visibility ?? 'public',
    status: draft.status ?? 'draft',
  }
}

function groupNoteFromApi(note: FansubGroupNote): GroupNoteDraft {
  return normalizeGroupNoteDraft({
    key: String(note.id),
    id: note.id,
    title: note.title,
    bodyJson: note.bodyJson,
    bodyHtml: note.bodyHtml,
    bodyText: note.bodyText,
    visibility: note.visibility,
    status: note.status,
    sortOrder: String(note.sortOrder),
    saving: false,
    deleting: false,
    error: null,
  })
}

interface NotesTabProps {
  fansubId: number
}

export function NotesTab({ fansubId }: NotesTabProps) {
  const { hasAccessToken, isClientInitialized } = useAuthSession()
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groupNotes, setGroupNotes] = useState<GroupNoteDraft[]>([])
  const [editingGroupNoteKeys, setEditingGroupNoteKeys] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    setLoadingNotes(true)
    void (async () => {
      if (!isClientInitialized) return
      if (!hasAccessToken) {
        setGroupNotes([])
        setLoadingNotes(false)
        return
      }
      try {
        const notes = await listFansubGroupNotes(fansubId)
        if (!cancelled) setGroupNotes(notes.map(groupNoteFromApi))
      } catch (err) {
        if (!cancelled) setLoadError(errMessage(err))
      } finally {
        if (!cancelled) setLoadingNotes(false)
      }
    })()
    return () => { cancelled = true }
  }, [hasAccessToken, fansubId, isClientInitialized])

  function updateGroupNote(key: string, partial: Partial<GroupNoteDraft>) {
    setGroupNotes((prev) => prev.map((note) => note.key === key ? { ...note, ...partial } : note))
  }

  function openGroupNoteEditor(key: string) {
    setEditingGroupNoteKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  function closeGroupNoteEditor(key: string) {
    setEditingGroupNoteKeys((prev) => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  async function saveGroupNote(key: string) {
    const rawDraft = groupNotes.find((note) => note.key === key)
    const draft = rawDraft ? normalizeGroupNoteDraft(rawDraft) : null
    if (!draft) return

    updateGroupNote(key, { saving: true, error: null })

    try {
      if (draft.id == null) {
        const req: CreateFansubGroupNoteRequest = {
          title: draft.title,
          bodyJson: ensureRichTextValue(draft.bodyJson),
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const created = await createFansubGroupNote(fansubId, req)
        setGroupNotes((prev) => prev.map((note) => note.key === key ? groupNoteFromApi(created) : note))
      } else {
        const req: UpdateFansubGroupNoteRequest = {
          title: draft.title,
          bodyJson: ensureRichTextValue(draft.bodyJson),
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const updated = await updateFansubGroupNote(fansubId, draft.id, req)
        setGroupNotes((prev) => prev.map((note) => note.key === key ? groupNoteFromApi(updated) : note))
      }
      closeGroupNoteEditor(key)
    } catch (err) {
      updateGroupNote(key, { saving: false, error: `Fehler beim Speichern: ${errMessage(err)}` })
    }
  }

  async function deleteGroupNote(key: string) {
    const draft = groupNotes.find((note) => note.key === key)
    if (!draft || draft.id == null) {
      setGroupNotes((prev) => prev.filter((note) => note.key !== key))
      closeGroupNoteEditor(key)
      return
    }

    if (!window.confirm('Gruppennotiz wirklich löschen?')) return

    updateGroupNote(key, { deleting: true, error: null })

    try {
      await deleteFansubGroupNote(fansubId, draft.id)
      setGroupNotes((prev) => prev.filter((note) => note.key !== key))
      closeGroupNoteEditor(key)
    } catch (err) {
      updateGroupNote(key, { deleting: false, error: `Fehler beim Löschen: ${errMessage(err)}` })
    }
  }

  if (loadingNotes) {
    return (
      <div className={styles.fansubEditSectionBody}>
        <p>Wird geladen...</p>
      </div>
    )
  }

  return (
    <div className={styles.fansubEditSectionBody}>
      {loadError ? <div className={styles.errorBox}>{loadError}</div> : null}

      <section>
        <h2 style={{ marginBottom: '0.25rem' }}>Gruppennotizen</h2>
        <p className={styles.fansubEditHint} style={{ marginBottom: '1rem' }}>
          Offizielle Texte über die Gruppe: Geschichte, Philosophie, Stil, Abschlüsse.
        </p>
        {groupNotes.map((draft) => (
          editingGroupNoteKeys.has(draft.key) || draft.id == null ? (
            <GroupNoteEditor
              key={draft.key}
              draft={draft}
              onUpdate={(partial) => updateGroupNote(draft.key, partial)}
              onSave={() => { void saveGroupNote(draft.key) }}
              onDelete={() => { void deleteGroupNote(draft.key) }}
            />
          ) : (
            <GroupNotePreview
              key={draft.key}
              draft={draft}
              onEdit={() => openGroupNoteEditor(draft.key)}
              onDelete={() => { void deleteGroupNote(draft.key) }}
            />
          )
        ))}
        {groupNotes.length === 0 && (
          <p className={styles.fansubEditHint}>Noch keine Gruppennotizen vorhanden.</p>
        )}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => {
            const nextDraft = normalizeGroupNoteDraft(emptyGroupNoteDraft())
            setGroupNotes((prev) => [...prev, nextDraft])
            openGroupNoteEditor(nextDraft.key)
          }}
          style={{ marginTop: '0.5rem' }}
        >
          <Plus size={14} />
          Neue Gruppennotiz hinzufügen
        </button>
      </section>
    </div>
  )
}
