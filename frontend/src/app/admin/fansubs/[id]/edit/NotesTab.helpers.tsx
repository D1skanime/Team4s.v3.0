'use client'

import { Pencil, Save, Trash2 } from 'lucide-react'

import { RichTextEditor, RichTextRenderer } from '@/components/editor'
import { Button } from '@/components/ui'
import { MemberStoryContextMember, MemberStoryContextRole } from '@/types/fansubNotes'
import sharedStyles from '../../../admin.module.css'
import editorScaffoldStyles from '../../../../../components/editor/EditorScaffold.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles, ...editorScaffoldStyles }

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
  bodyHtml?: string | null
  bodyText?: string | null
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
  bodyHtml?: string | null
  bodyText?: string | null
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
    bodyHtml: null,
    bodyText: null,
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
    bodyHtml: null,
    bodyText: null,
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

function visibilityLabel(value: GroupNoteDraft['visibility'] | StoryDraft['visibility']): string {
  return value === 'public' ? 'Öffentlich' : 'Intern'
}

function statusLabel(value: GroupNoteDraft['status'] | StoryDraft['status']): string {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function previewText(value?: string | null): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Noch kein Inhalt vorhanden.'
  return normalized.length > 240 ? `${normalized.slice(0, 240).trimEnd()}…` : normalized
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

export function GroupNotePreview({
  draft,
  onEdit,
  onDelete,
}: {
  draft: GroupNoteDraft
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <section className={styles.editorCard}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}

      <div className={styles.editorCardHeader}>
        <div className={styles.editorCardHeading}>
          <p className={styles.editorEyebrow}>Gruppennotiz</p>
          <h3 className={styles.editorTitle}>{draft.title.trim() || 'Unbenannte Notiz'}</h3>
        </div>
        <div className={styles.editorBadgeRow}>
          <span className={styles.editorBadge}>{visibilityLabel(draft.visibility)}</span>
          <span className={styles.editorBadge}>{statusLabel(draft.status)}</span>
        </div>
      </div>

      {draft.bodyHtml?.trim() ? (
        <RichTextRenderer bodyHtml={draft.bodyHtml} />
      ) : (
        <p className={styles.editorPreviewText}>{previewText(draft.bodyText)}</p>
      )}

      <div className={styles.editorActionBar}>
        <button type="button" className={styles.button} onClick={onEdit}>
          <Pencil size={14} />Bearbeiten
        </button>
        <button type="button" className={`${styles.buttonSecondary} ${styles.editorGhostButton}`} onClick={onDelete}>
          <Trash2 size={14} />Löschen
        </button>
      </div>
    </section>
  )
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
    <section className={styles.editorCard}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}

      <div className={styles.editorCardHeader}>
        <div className={styles.editorCardHeading}>
          <p className={styles.editorEyebrow}>Gruppennotiz</p>
          <h3 className={styles.editorTitle}>{draft.title.trim() || 'Unbenannte Notiz'}</h3>
        </div>
        <div className={styles.editorBadgeRow}>
          <span className={styles.editorBadge}>{visibilityLabel(draft.visibility)}</span>
          <span className={styles.editorBadge}>{statusLabel(draft.status)}</span>
        </div>
      </div>

      <div className={styles.editorMain}>
        <div className={styles.field}>
          <label>Titel</label>
          <input value={draft.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Titel der Notiz" />
        </div>

        <div className={styles.field}>
          <label>Inhalt</label>
          <div className={styles.editorSurface}>
            <RichTextEditor
              value={ensureRichTextValue(draft.bodyJson)}
              onChange={(next) => onUpdate({ bodyJson: next })}
              placeholder="Notiztext eingeben..."
              mode="longform"
              minHeight={220}
            />
          </div>
        </div>
      </div>

      <div className={styles.editorMetaCard}>
        <div className={styles.editorMetaHeader}>
          <div>
            <p className={styles.editorEyebrow}>Optionen</p>
            <h4 className={styles.editorMetaTitle}>Status und Sichtbarkeit</h4>
          </div>
        </div>

        <div className={styles.editorMetaGrid}>
          <div className={styles.field}>
            <label>Sichtbarkeit</label>
            <select value={draft.visibility} onChange={(e) => onUpdate({ visibility: e.target.value as 'public' | 'internal' })}>
              {VISIBILITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Status</label>
            <select value={draft.status} onChange={(e) => onUpdate({ status: e.target.value as GroupNoteDraft['status'] })}>
              {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Reihenfolge</label>
            <input type="number" value={draft.sortOrder} onChange={(e) => onUpdate({ sortOrder: e.target.value })} min={0} />
          </div>
        </div>
      </div>

      <div className={styles.editorActionBar}>
        <Button
          variant="success"
          className={styles.editorPrimaryAction}
          leftIcon={<Save size={14} />}
          onClick={onSave}
          disabled={draft.saving || draft.deleting}
        >
          {draft.saving ? 'Speichern...' : 'Speichern'}
        </Button>
        <button type="button" className={`${styles.buttonSecondary} ${styles.editorGhostButton}`} onClick={onDelete} disabled={draft.saving || draft.deleting}>
          <Trash2 size={14} />{draft.id != null ? (draft.deleting ? 'Löschen...' : 'Löschen') : 'Verwerfen'}
        </button>
      </div>
    </section>
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
    <section className={styles.editorCard}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}

      <div className={styles.editorCardHeader}>
        <div className={styles.editorCardHeading}>
          <p className={styles.editorEyebrow}>Mitgliedergeschichte</p>
          <h3 className={styles.editorTitle}>{draft.title.trim() || memberLabel || 'Neue Geschichte'}</h3>
        </div>
        <div className={styles.editorBadgeRow}>
          <span className={styles.editorBadge}>{visibilityLabel(draft.visibility)}</span>
          <span className={styles.editorBadge}>{statusLabel(draft.status)}</span>
        </div>
      </div>

      <div className={styles.editorMain}>
        <div className={styles.editorMetaGrid}>
          <div className={styles.field}>
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
          <div className={styles.field}>
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
          <div className={styles.editorSurface}>
            <RichTextEditor
              value={ensureRichTextValue(draft.bodyJson)}
              onChange={(next) => onUpdate({ bodyJson: next })}
              placeholder="Geschichte eingeben..."
              mode="longform"
              minHeight={220}
            />
          </div>
        </div>
      </div>

      <div className={styles.editorMetaCard}>
        <div className={styles.editorMetaHeader}>
          <div>
            <p className={styles.fansubEditorEyebrow}>Optionen</p>
            <h4 className={styles.fansubEditorMetaTitle}>Veröffentlichung und Sortierung</h4>
          </div>
          <p className={styles.fansubEditHint}>Die Geschichte bleibt vorne ruhig, die Verwaltung sitzt gesammelt darunter.</p>
        </div>

        <div className={styles.editorMetaGrid}>
          <div className={styles.field}>
            <label>Sichtbarkeit</label>
            <select value={draft.visibility} onChange={(e) => onUpdate({ visibility: e.target.value as 'public' | 'internal' })}>
              {VISIBILITY_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Status</label>
            <select value={draft.status} onChange={(e) => onUpdate({ status: e.target.value as StoryDraft['status'] })}>
              {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label>Reihenfolge</label>
            <input type="number" value={draft.sortOrder} onChange={(e) => onUpdate({ sortOrder: e.target.value })} min={0} />
          </div>
        </div>
      </div>

      <div className={styles.editorActionBar}>
        <Button
          variant="success"
          className={styles.editorPrimaryAction}
          leftIcon={<Save size={14} />}
          onClick={onSave}
          disabled={draft.saving || draft.deleting}
        >
          {draft.saving ? 'Speichern...' : 'Speichern'}
        </Button>
        <button type="button" className={`${styles.buttonSecondary} ${styles.editorGhostButton}`} onClick={onDelete} disabled={draft.saving || draft.deleting}>
          <Trash2 size={14} />{draft.id != null ? (draft.deleting ? 'Löschen...' : 'Löschen') : 'Verwerfen'}
        </button>
      </div>
    </section>
  )
}

export function StoryPreview({
  draft,
  members,
  roles,
  onEdit,
  onDelete,
}: {
  draft: StoryDraft
  members: MemberStoryContextMember[]
  roles: MemberStoryContextRole[]
  onEdit: () => void
  onDelete: () => void
}) {
  const memberLabel = findMemberLabel(members, draft.memberId)
  const roleLabel = findRoleLabel(roles, draft.roleId)

  return (
    <section className={styles.editorCard}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}

      <div className={styles.editorCardHeader}>
        <div className={styles.editorCardHeading}>
          <p className={styles.editorEyebrow}>Mitgliedergeschichte</p>
          <h3 className={styles.editorTitle}>{draft.title.trim() || memberLabel || 'Neue Geschichte'}</h3>
          <p className={styles.fansubEditHint}>
            {memberLabel || 'Kein Mitglied gewählt'}
            {roleLabel ? ` • ${roleLabel}` : ''}
          </p>
        </div>
        <div className={styles.editorBadgeRow}>
          <span className={styles.editorBadge}>{visibilityLabel(draft.visibility)}</span>
          <span className={styles.editorBadge}>{statusLabel(draft.status)}</span>
        </div>
      </div>

      {draft.bodyHtml?.trim() ? (
        <RichTextRenderer bodyHtml={draft.bodyHtml} />
      ) : (
        <p className={styles.editorPreviewText}>{previewText(draft.bodyText)}</p>
      )}

      <div className={styles.editorActionBar}>
        <button type="button" className={styles.button} onClick={onEdit}>
          <Pencil size={14} />Weiter bearbeiten
        </button>
        <button type="button" className={`${styles.buttonSecondary} ${styles.editorGhostButton}`} onClick={onDelete}>
          <Trash2 size={14} />Löschen
        </button>
      </div>
    </section>
  )
}
