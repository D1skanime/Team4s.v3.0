'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

import {
  ApiError,
  createFansubGroupNote,
  createMemberGroupStory,
  deleteFansubGroupNote,
  deleteMemberGroupStory,
  getMemberGroupStoryContext,
  getRuntimeAuthToken,
  getRuntimeDisplayName,
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
  MemberStoryContext,
  UpdateFansubGroupNoteRequest,
  UpdateMemberGroupStoryRequest,
} from '@/types/fansubNotes'
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import {
  emptyGroupNoteDraft,
  emptyStoryDraft,
  ensureRichTextValue,
  GroupNoteDraft,
  GroupNoteEditor,
  GroupNotePreview,
  StoryDraft,
  StoryEditor,
  StoryPreview,
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

function normalizeStoryDraft(draft: StoryDraft): StoryDraft {
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

function storyFromApi(story: MemberGroupStory): StoryDraft {
  return normalizeStoryDraft({
    key: String(story.id),
    id: story.id,
    memberId: String(story.memberId),
    roleId: story.roleId != null ? String(story.roleId) : '',
    title: story.title,
    bodyJson: story.bodyJson,
    bodyHtml: story.bodyHtml,
    bodyText: story.bodyText,
    visibility: story.visibility,
    status: story.status,
    sortOrder: String(story.sortOrder),
    saving: false,
    deleting: false,
    error: null,
  })
}

function pickDefaultStoryMember(context: MemberStoryContext): string {
  const displayName = getRuntimeDisplayName().trim().toLowerCase()
  if (displayName) {
    const match = context.members.find((member) => member.nickname.trim().toLowerCase() === displayName)
    if (match) {
      return String(match.id)
    }
  }

  if (context.members.length === 1) {
    return String(context.members[0].id)
  }

  return ''
}

interface NotesTabProps {
  fansubId: number
}

export function NotesTab({ fansubId }: NotesTabProps) {
  const [loadingNotes, setLoadingNotes] = useState(true)
  const [loadingStories, setLoadingStories] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [groupNotes, setGroupNotes] = useState<GroupNoteDraft[]>([])
  const [stories, setStories] = useState<StoryDraft[]>([])
  const [storyContext, setStoryContext] = useState<MemberStoryContext>({ members: [], roles: [] })
  const [editingGroupNoteKeys, setEditingGroupNoteKeys] = useState<Set<string>>(() => new Set())
  const [editingStoryKeys, setEditingStoryKeys] = useState<Set<string>>(() => new Set())

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
        const [context, list] = await Promise.all([
          getMemberGroupStoryContext(fansubId, token ?? undefined),
          listMemberGroupStories(fansubId, token ?? undefined),
        ])

        if (!cancelled) {
          setStoryContext(context)
          setStories(list.map(storyFromApi))
        }
      } catch (err) {
        if (!cancelled) setLoadError(errMessage(err))
      } finally {
        if (!cancelled) setLoadingStories(false)
      }
    })()
    return () => { cancelled = true }
  }, [fansubId])

  function updateGroupNote(key: string, partial: Partial<GroupNoteDraft>) {
    setGroupNotes((prev) => prev.map((note) => note.key === key ? { ...note, ...partial } : note))
  }

  function updateStory(key: string, partial: Partial<StoryDraft>) {
    setStories((prev) => prev.map((story) => story.key === key ? { ...story, ...partial } : story))
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

  function openStoryEditor(key: string) {
    setEditingStoryKeys((prev) => {
      const next = new Set(prev)
      next.add(key)
      return next
    })
  }

  function closeStoryEditor(key: string) {
    setEditingStoryKeys((prev) => {
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
      const token = await getRuntimeAuthToken()
      if (draft.id == null) {
        const req: CreateFansubGroupNoteRequest = {
          title: draft.title,
          bodyJson: ensureRichTextValue(draft.bodyJson),
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const created = await createFansubGroupNote(fansubId, req, token ?? undefined)
        setGroupNotes((prev) => prev.map((note) => note.key === key ? groupNoteFromApi(created) : note))
      } else {
        const req: UpdateFansubGroupNoteRequest = {
          title: draft.title,
          bodyJson: ensureRichTextValue(draft.bodyJson),
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const updated = await updateFansubGroupNote(fansubId, draft.id, req, token ?? undefined)
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
      const token = await getRuntimeAuthToken()
      await deleteFansubGroupNote(fansubId, draft.id, token ?? undefined)
      setGroupNotes((prev) => prev.filter((note) => note.key !== key))
      closeGroupNoteEditor(key)
    } catch (err) {
      updateGroupNote(key, { deleting: false, error: `Fehler beim Löschen: ${errMessage(err)}` })
    }
  }

  async function saveStory(key: string) {
    const rawDraft = stories.find((story) => story.key === key)
    const draft = rawDraft ? normalizeStoryDraft(rawDraft) : null
    if (!draft) return

    const memberIdNum = Number(draft.memberId)
    if (!memberIdNum || !Number.isFinite(memberIdNum) || memberIdNum < 1) {
      updateStory(key, { error: 'Mitglied ist erforderlich.' })
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
          bodyJson: ensureRichTextValue(draft.bodyJson),
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const created = await createMemberGroupStory(fansubId, req, token ?? undefined)
        setStories((prev) => prev.map((story) => story.key === key ? storyFromApi(created) : story))
      } else {
        const req: UpdateMemberGroupStoryRequest = {
          title: draft.title,
          bodyJson: ensureRichTextValue(draft.bodyJson),
          visibility: draft.visibility,
          status: draft.status,
          sortOrder: Number(draft.sortOrder) || 0,
        }
        const updated = await updateMemberGroupStory(fansubId, draft.id, req, token ?? undefined)
        setStories((prev) => prev.map((story) => story.key === key ? storyFromApi(updated) : story))
      }
      closeStoryEditor(key)
    } catch (err) {
      updateStory(key, { saving: false, error: `Fehler beim Speichern: ${errMessage(err)}` })
    }
  }

  async function deleteStory(key: string) {
    const draft = stories.find((story) => story.key === key)
    if (!draft || draft.id == null) {
      setStories((prev) => prev.filter((story) => story.key !== key))
      closeStoryEditor(key)
      return
    }

    if (!window.confirm('Geschichte wirklich löschen?')) return

    updateStory(key, { deleting: true, error: null })

    try {
      const token = await getRuntimeAuthToken()
      await deleteMemberGroupStory(fansubId, draft.id, token ?? undefined)
      setStories((prev) => prev.filter((story) => story.key !== key))
      closeStoryEditor(key)
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

      <section>
        <h2 style={{ marginBottom: '0.25rem' }}>Mitgliedergeschichten</h2>
        <p className={styles.fansubEditHint} style={{ marginBottom: '1rem' }}>
          Persönliche Erinnerungen einzelner Mitglieder in dieser Gruppe.
        </p>
        {stories.map((draft) => (
          editingStoryKeys.has(draft.key) || draft.id == null ? (
            <StoryEditor
              key={draft.key}
              draft={draft}
              members={storyContext.members}
              roles={storyContext.roles}
              onUpdate={(partial) => updateStory(draft.key, partial)}
              onSave={() => { void saveStory(draft.key) }}
              onDelete={() => { void deleteStory(draft.key) }}
            />
          ) : (
            <StoryPreview
              key={draft.key}
              draft={draft}
              members={storyContext.members}
              roles={storyContext.roles}
              onEdit={() => openStoryEditor(draft.key)}
              onDelete={() => { void deleteStory(draft.key) }}
            />
          )
        ))}
        {stories.length === 0 && (
          <p className={styles.fansubEditHint}>Noch keine Mitgliedergeschichten vorhanden.</p>
        )}
        <button
          type="button"
          className={styles.buttonSecondary}
          onClick={() => {
            const nextDraft = normalizeStoryDraft(emptyStoryDraft({ memberId: pickDefaultStoryMember(storyContext) }))
            setStories((prev) => [...prev, nextDraft])
            openStoryEditor(nextDraft.key)
          }}
          style={{ marginTop: '0.5rem' }}
          disabled={storyContext.members.length === 0}
        >
          <Plus size={14} />
          Neue Geschichte hinzufügen
        </button>
        {storyContext.members.length === 0 ? (
          <p className={styles.fansubEditHint} style={{ marginTop: '0.5rem' }}>
            Es sind noch keine auswählbaren Mitglieder vorhanden.
          </p>
        ) : null}
      </section>
    </div>
  )
}
