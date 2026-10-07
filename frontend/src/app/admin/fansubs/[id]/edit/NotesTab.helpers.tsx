'use client'

import { Pencil, Save, Trash2 } from 'lucide-react'

import { RichTextEditor } from '@/components/editor'
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Button } from '@/components/ui'
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

export function ensureRichTextValue(value: unknown | null): unknown {
  return value ?? EMPTY_RICH_TEXT_DOC
}

function visibilityLabel(value: GroupNoteDraft['visibility']): string {
  return value === 'public' ? 'Öffentlich' : 'Intern'
}

function statusLabel(value: GroupNoteDraft['status']): string {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value
}

function previewText(value?: string | null): string {
  const normalized = (value || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return 'Noch kein Inhalt vorhanden.'
  return normalized.length > 240 ? `${normalized.slice(0, 240).trimEnd()}…` : normalized
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

