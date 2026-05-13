'use client'

import { Save, Trash2 } from 'lucide-react'

import { RichTextEditor } from '@/components/editor'
import { MemberStoryContextMember, MemberStoryContextRole } from '@/types/fansubNotes'
import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

export const VISIBILITY_OPTIONS: Array<{ value: 'public' | 'internal'; label: string }> = [
  { value: 'public', label: 'Öffentlich' },
  { value: 'internal', label: 'Intern' },
]

export const STATUS_OPTIONS: Array<{ value: 'draft' | 'published' | 'archived' | 'deleted'; label: string }> = [
  { value: 'draft', label: 'Entwurf' },
  { value: 'published', label: 'Veröffentlicht' },
  { value: 'archived', label: 'Archiviert' },
  { value: 'deleted', label: 'Gelöscht' },
]

export const EMPTY_RICH_TEXT_DOC = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
} as const

export type GroupNoteDraft = {
  key: string
  id: number | null
  title: string
  bodyJson: unknown | null
  visibility: 'public' | 'internal'
  status: 'draft' | 'published' | 'archived' | 'deleted'
  sortOrder: string
  saving: boolean
  deleting: boolean
  error: string | null
}

export type StoryDraft = {
  key: string
  id: number | null
  memberId: string
  roleId: string
  title: string
  bodyJson: unknown | null
  visibility: 'public' | 'internal'
  status: 'draft' | 'published' | 'archived' | 'deleted'
  sortOrder: string
  saving: boolean
  deleting: boolean
  error: string | null
}

export function emptyGroupNoteDraft(): GroupNoteDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    title: '',
    bodyJson: null,
    visibility: 'public',
    status: 'draft',
    sortOrder: '0',
    saving: false,
    deleting: false,
    error: null,
  }
}

export function emptyStoryDraft(defaults?: Partial<Pick<StoryDraft, 'memberId' | 'roleId'>>): StoryDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    memberId: defaults?.memberId ?? '',
    roleId: defaults?.roleId ?? '',
    title: '',
    bodyJson: null,
    visibility: 'public',
    status: 'draft',
    sortOrder: '0',
    saving: false,
    deleting: false,
    error: null,
  }
}

export function ensureRichTextValue(value: unknown | null): unknown {
  return value ?? EMPTY_RICH_TEXT_DOC
}

function findMemberLabel(members: MemberStoryContextMember[], memberId: string): string {
  const id = Number(memberId)
  const match = members.find((member) => member.id === id)
  return match ? match.nickname : ''
}

function findRoleLabel(roles: MemberStoryContextRole[], roleId: string): string {
  const id = Number(roleId)
  const match = roles.find((role) => role.id === id)
  return match ? `${match.label} (${match.name})` : ''
}

export function GroupNoteEditor({
  draft,
  onUpdate,
  onSave,
  onDelete,
}: {
  draft: GroupNoteDraft
  onUpdate: (partial: Partial<GroupNoteDraft>) => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-color, #ddd)', borderRadius: '6px' }}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}
      <div className={styles.field}>
        <label>Titel</label>
        <input value={draft.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Titel der Notiz" />
      </div>

      <div className={styles.field}>
        <label>Inhalt</label>
        <RichTextEditor
          value={ensureRichTextValue(draft.bodyJson)}
          onChange={(next) => onUpdate({ bodyJson: next })}
          placeholder="Notiztext eingeben..."
          mode="longform"
          minHeight={220}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label>Sichtbarkeit</label>
          <select value={draft.visibility} onChange={(e) => onUpdate({ visibility: e.target.value as 'public' | 'internal' })}>
            {VISIBILITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label>Status</label>
          <select value={draft.status} onChange={(e) => onUpdate({ status: e.target.value as GroupNoteDraft['status'] })}>
            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className={styles.field} style={{ flex: '0 0 100px' }}>
          <label>Reihenfolge</label>
          <input type="number" value={draft.sortOrder} onChange={(e) => onUpdate({ sortOrder: e.target.value })} min={0} />
        </div>
      </div>

      <div className={styles.inputRow} style={{ marginTop: '0.75rem' }}>
        <button type="button" className={styles.button} onClick={onSave} disabled={draft.saving || draft.deleting}>
          <Save size={14} />{draft.saving ? 'Speichern...' : 'Speichern'}
        </button>
        <button type="button" className={styles.buttonSecondary} style={{ color: 'var(--danger-color, #c0392b)' }} onClick={onDelete} disabled={draft.saving || draft.deleting}>
          <Trash2 size={14} />{draft.id != null ? (draft.deleting ? 'Löschen...' : 'Löschen') : 'Verwerfen'}
        </button>
      </div>
    </div>
  )
}

export function StoryEditor({
  draft,
  members,
  roles,
  onUpdate,
  onSave,
  onDelete,
}: {
  draft: StoryDraft
  members: MemberStoryContextMember[]
  roles: MemberStoryContextRole[]
  onUpdate: (partial: Partial<StoryDraft>) => void
  onSave: () => void
  onDelete: () => void
}) {
  const isExistingStory = draft.id != null
  const memberLabel = findMemberLabel(members, draft.memberId)
  const roleLabel = findRoleLabel(roles, draft.roleId)
  const memberInputId = `story-member-${draft.key}`
  const roleInputId = `story-role-${draft.key}`

  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-color, #ddd)', borderRadius: '6px' }}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label htmlFor={memberInputId}>Mitglied <span className={styles.fansubEditRequired}>*</span></label>
          <select id={memberInputId} value={draft.memberId} onChange={(e) => onUpdate({ memberId: e.target.value })} disabled={isExistingStory}>
            <option value="">Mitglied auswählen</option>
            {members.map((member) => (
              <option key={member.id} value={String(member.id)}>
                {member.nickname}
              </option>
            ))}
            {draft.memberId && !memberLabel ? <option value={draft.memberId}>Unbekanntes Mitglied (#{draft.memberId})</option> : null}
          </select>
          {isExistingStory ? <p className={styles.fansubEditHint}>Das Mitglied bleibt beim Bearbeiten unverändert.</p> : null}
        </div>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label htmlFor={roleInputId}>Rolle <span className={styles.fansubEditHint}>(optional)</span></label>
          <select id={roleInputId} value={draft.roleId} onChange={(e) => onUpdate({ roleId: e.target.value })} disabled={isExistingStory}>
            <option value="">Keine feste Rolle</option>
            {roles.map((role) => (
              <option key={role.id} value={String(role.id)}>
                {role.label} ({role.name})
              </option>
            ))}
            {draft.roleId && !roleLabel ? <option value={draft.roleId}>Unbekannte Rolle (#{draft.roleId})</option> : null}
          </select>
          {isExistingStory ? <p className={styles.fansubEditHint}>Die Rolle bleibt beim Bearbeiten unverändert.</p> : null}
        </div>
      </div>

      <div className={styles.field}>
        <label>Titel</label>
        <input value={draft.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Titel der Geschichte" />
      </div>

      <div className={styles.field}>
        <label>Inhalt</label>
        <RichTextEditor
          value={ensureRichTextValue(draft.bodyJson)}
          onChange={(next) => onUpdate({ bodyJson: next })}
          placeholder="Geschichte eingeben..."
          mode="longform"
          minHeight={220}
        />
      </div>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label>Sichtbarkeit</label>
          <select value={draft.visibility} onChange={(e) => onUpdate({ visibility: e.target.value as 'public' | 'internal' })}>
            {VISIBILITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label>Status</label>
          <select value={draft.status} onChange={(e) => onUpdate({ status: e.target.value as StoryDraft['status'] })}>
            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
        <div className={styles.field} style={{ flex: '0 0 100px' }}>
          <label>Reihenfolge</label>
          <input type="number" value={draft.sortOrder} onChange={(e) => onUpdate({ sortOrder: e.target.value })} min={0} />
        </div>
      </div>

      <div className={styles.inputRow} style={{ marginTop: '0.75rem' }}>
        <button type="button" className={styles.button} onClick={onSave} disabled={draft.saving || draft.deleting}>
          <Save size={14} />{draft.saving ? 'Speichern...' : 'Speichern'}
        </button>
        <button type="button" className={styles.buttonSecondary} style={{ color: 'var(--danger-color, #c0392b)' }} onClick={onDelete} disabled={draft.saving || draft.deleting}>
          <Trash2 size={14} />{draft.id != null ? (draft.deleting ? 'Löschen...' : 'Löschen') : 'Verwerfen'}
        </button>
      </div>
    </div>
  )
}
