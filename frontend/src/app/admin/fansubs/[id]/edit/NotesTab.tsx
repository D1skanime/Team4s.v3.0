'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import {
  ApiError,
  createFansubGroupNote,
  createMemberGroupStory,
  deleteFansubGroupNote,
  deleteMemberGroupStory,
  getRuntimeAuthToken,
  listFansubGroupNotes,
  listMemberGroupStories,
  updateFansubGroupNote,
  updateMemberGroupStory,
} from '@/lib/api'
import {
  CreateFansubGroupNoteRequest,
  CreateMemberGroupStoryRequest,
  FansubGroupNote,
  MemberGroupStory,
  UpdateFansubGroupNoteRequest,
  UpdateMemberGroupStoryRequest,
} from '@/types/fansubNotes'
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import {
  emptyGroupNoteDraft,
  emptyStoryDraft,
  GroupNoteEditor,
  GroupNoteDraft,
  StoryDraft,
  StoryEditor,
} from './NotesTab.helpers'

const styles = { ...sharedStyles, ...fansubEditStyles }

function errMessage(error: unknown): string {
  return error instanceof ApiError ? `(${error.status}) ${error.message}` : 'Anfrage fehlgeschlagen.'
}

function groupNoteFromApi(note: FansubGroupNote): GroupNoteDraft {
  return {
    key: String(note.id),
    id: note.id,
    title: note.title,
    bodyMarkdown: note.bodyMarkdown,
    visibility: note.visibility,
    status: note.status,
    sortOrder: String(note.sortOrder),
    saving: false,
    deleting: false,
    error: null,
  }
}

function storyFromApi(story: MemberGroupStory): StoryDraft {
  return {
    key: String(story.id),
    id: story.id,
    memberId: String(story.memberId),
    roleId: story.roleId != null ? String(story.roleId) : '',
    title: story.title,
    bodyMarkdown: story.bodyMarkdown,
    visibility: story.visibility,
    status: story.status,
    sortOrder: String(story.sortOrder),
    saving: false,
    deleting: false,
    error: null,
  }
}

// ─── NotesTab ────────────────────────────────────────────────────────────────

interface NotesTabProps {
  fansubId: number
}

export function NotesTab({ fansubId }: NotesTabProps) {
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [loadingStories, setLoadingStories] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groupNotes, setGroupNotes] = useState<GroupNoteDraft[]>([])
  const [stories, setStories] = useState<StoryDraft[]>([])

  useEffect(() => {
    let cancelled = false
    setLoadingNotes(true)
    void (async () => {
      try {
        const token = await getRuntimeAuthToken()
        const notes = await listFansubGroupNotes(fansubId, token ?? undefined)
        if (!cancelled) setGroupNotes(notes.map(groupNoteFromApi))
      } catch (err) {
        if (!cancelled) setLoadError(errMessage(err))
      } finally {
        if (!cancelled) setLoadingNotes(false)
      }
    })()
    return () => { cancelled = true }
  }, [fansubId])

  useEffect(() => {
    let cancelled = false
    setLoadingStories(true)
    void (async () => {
      try {
        const token = await getRuntimeAuthToken()
        const list = await listMemberGroupStories(fansubId, token ?? undefined)
        if (!cancelled) setStories(list.map(storyFromApi))
      } catch (err) {
        if (!cancelled) setLoadError(errMessage(err))
      } finally {
        if (!cancelled) setLoadingStories(false)
      }
    })()
    return () => { cancelled = true }
  }, [fansubId])

  function updateGroupNote(key: string, partial: Partial<GroupNoteDraft>) {
    setGroupNotes((prev) => prev.map((n) => n.key === key ? { ...n, ...partial } : n))
  }

  async function saveGroupNote(key: string) {
    const draft = groupNotes.find((n) => n.key === key)
    if (!draft) return
    updateGroupNote(key, { saving: true, error: null })
    try {
      const token = await getRuntimeAuthToken()
      if (draft.id == null) {
        const req: CreateFansubGroupNoteRequest = {
          title: draft.title,
          bodyMarkdown: draft.bodyMarkdown,
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const created = await createFansubGroupNote(fansubId, req, token ?? undefined)
        setGroupNotes((prev) => prev.map((n) => n.key === key ? groupNoteFromApi(created) : n))
      } else {
        const req: UpdateFansubGroupNoteRequest = {
          title: draft.title,
          bodyMarkdown: draft.bodyMarkdown,
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const updated = await updateFansubGroupNote(fansubId, draft.id, req, token ?? undefined)
        setGroupNotes((prev) => prev.map((n) => n.key === key ? groupNoteFromApi(updated) : n))
      }
    } catch (err) {
      updateGroupNote(key, { saving: false, error: `Fehler beim Speichern: ${errMessage(err)}` })
    }
  }

  async function deleteGroupNote(key: string) {
    const draft = groupNotes.find((n) => n.key === key)
    if (!draft || draft.id == null) {
      setGroupNotes((prev) => prev.filter((n) => n.key !== key))
      return
    }
    if (!window.confirm('Gruppennotiz wirklich löschen?')) return
    updateGroupNote(key, { deleting: true, error: null })
    try {
      const token = await getRuntimeAuthToken()
      await deleteFansubGroupNote(fansubId, draft.id, token ?? undefined)
      setGroupNotes((prev) => prev.filter((n) => n.key !== key))
    } catch (err) {
      updateGroupNote(key, { deleting: false, error: `Fehler beim Löschen: ${errMessage(err)}` })
    }
  }

  function updateStory(key: string, partial: Partial<StoryDraft>) {
    setStories((prev) => prev.map((s) => s.key === key ? { ...s, ...partial } : s))
  }

  async function saveStory(key: string) {
    const draft = stories.find((s) => s.key === key)
    if (!draft) return
    const memberIdNum = Number(draft.memberId)
    if (!memberIdNum || !Number.isFinite(memberIdNum) || memberIdNum < 1) {
      updateStory(key, { error: 'Mitglieds-ID ist erforderlich und muss eine gültige Zahl sein.' })
      return
    }
    updateStory(key, { saving: true, error: null })
    try {
      const token = await getRuntimeAuthToken()
      const roleIdNum = draft.roleId.trim() ? Number(draft.roleId) : null
      if (draft.id == null) {
        const req: CreateMemberGroupStoryRequest = {
          memberId: memberIdNum,
          roleId: roleIdNum,
          title: draft.title,
          bodyMarkdown: draft.bodyMarkdown,
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const created = await createMemberGroupStory(fansubId, req, token ?? undefined)
        setStories((prev) => prev.map((s) => s.key === key ? storyFromApi(created) : s))
      } else {
        const req: UpdateMemberGroupStoryRequest = {
          memberId: memberIdNum,
          roleId: roleIdNum,
          title: draft.title,
          bodyMarkdown: draft.bodyMarkdown,
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const updated = await updateMemberGroupStory(fansubId, draft.id, req, token ?? undefined)
        setStories((prev) => prev.map((s) => s.key === key ? storyFromApi(updated) : s))
      }
    } catch (err) {
      updateStory(key, { saving: false, error: `Fehler beim Speichern: ${errMessage(err)}` })
    }
  }

  async function deleteStory(key: string) {
    const draft = stories.find((s) => s.key === key)
    if (!draft || draft.id == null) {
      setStories((prev) => prev.filter((s) => s.key !== key))
      return
    }
    if (!window.confirm('Geschichte wirklich löschen?')) return
    updateStory(key, { deleting: true, error: null })
    try {
      const token = await getRuntimeAuthToken()
      await deleteMemberGroupStory(fansubId, draft.id, token ?? undefined)
      setStories((prev) => prev.filter((s) => s.key !== key))
    } catch (err) {
      updateStory(key, { deleting: false, error: `Fehler beim Löschen: ${errMessage(err)}` })
    }
  }

  if (loadingNotes || loadingStories) {
    return (
      <div className={styles.fansubEditSectionBody}>
        <p>Wird geladen...</p>
      </div>
    )
  }

  return (
    <div className={styles.fansubEditSectionBody}>
      {loadError ? <div className={styles.errorBox}>{loadError}</div> : null}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ marginBottom: '0.25rem' }}>Gruppennotizen</h2>
        <p className={styles.fansubEditHint} style={{ marginBottom: '1rem' }}>
          Offizielle Texte über die Gruppe: Geschichte, Philosophie, Stil, Abschlüsse.
        </p>
        {groupNotes.map((draft) => (
          <GroupNoteEditor
            key={draft.key}
            draft={draft}
            onUpdate={(partial) => updateGroupNote(draft.key, partial)}
            onSave={() => { void saveGroupNote(draft.key) }}
            onDelete={() => { void deleteGroupNote(draft.key) }}
          />
        ))}
        {groupNotes.length === 0 && (
          <p className={styles.fansubEditHint}>Noch keine Gruppennotizen vorhanden.</p>
        )}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => setGroupNotes((prev) => [...prev, emptyGroupNoteDraft()])}
          style={{ marginTop: '0.5rem' }}
        >
          <Plus size={14} />
          Neue Gruppennotiz hinzufügen
        </button>
      </section>

      <section>
        <h2 style={{ marginBottom: '0.25rem' }}>Mitgliedergeschichten</h2>
        <p className={styles.fansubEditHint} style={{ marginBottom: '1rem' }}>
          Persönliche Erinnerungen einzelner Mitglieder in dieser Gruppe.
        </p>
        {stories.map((draft) => (
          <StoryEditor
            key={draft.key}
            draft={draft}
            onUpdate={(partial) => updateStory(draft.key, partial)}
            onSave={() => { void saveStory(draft.key) }}
            onDelete={() => { void deleteStory(draft.key) }}
          />
        ))}
        {stories.length === 0 && (
          <p className={styles.fansubEditHint}>Noch keine Mitgliedergeschichten vorhanden.</p>
        )}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => setStories((prev) => [...prev, emptyStoryDraft()])}
          style={{ marginTop: '0.5rem' }}
        >
          <Plus size={14} />
          Neue Geschichte hinzufügen
        </button>
      </section>
    </div>
  )
}
