'use client'

import { type RefObject, useRef, useMemo } from 'react'
import { marked } from 'marked'
import { Bold, Heading1, Heading2, Italic, Link2, List, Save, Trash2 } from 'lucide-react'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

export const MARKDOWN_SOFT_LIMIT = 8000

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

// ─── Draft-Typen ─────────────────────────────────────────────────────────────

export type GroupNoteDraft = {
  key: string
  id: number | null
  title: string
  bodyMarkdown: string
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
  bodyMarkdown: string
  visibility: 'public' | 'internal'
  status: 'draft' | 'published' | 'archived' | 'deleted'
  sortOrder: string
  saving: boolean
  deleting: boolean
  error: string | null
}

// ─── Fabrik-Funktionen ────────────────────────────────────────────────────────

export function emptyGroupNoteDraft(): GroupNoteDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    title: '',
    bodyMarkdown: '',
    visibility: 'public',
    status: 'draft',
    sortOrder: '0',
    saving: false,
    deleting: false,
    error: null,
  }
}

export function emptyStoryDraft(): StoryDraft {
  return {
    key: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    id: null,
    memberId: '',
    roleId: '',
    title: '',
    bodyMarkdown: '',
    visibility: 'public',
    status: 'draft',
    sortOrder: '0',
    saving: false,
    deleting: false,
    error: null,
  }
}

// ─── Markdown-Vorschau ────────────────────────────────────────────────────────

function MarkdownPreview({ markdown }: { markdown: string }) {
  const html = useMemo(() => {
    if (!markdown.trim()) return ''
    return marked.parse(markdown) as string
  }, [markdown])
  if (!html) return <div className={styles.fansubEditMarkdownPreview} style={{ color: '#888', padding: '8px' }}>Keine Vorschau.</div>
  return <div className={styles.fansubEditMarkdownPreview} dangerouslySetInnerHTML={{ __html: html }} />
}

// ─── Markdown-Toolbar ─────────────────────────────────────────────────────────

export function MarkdownToolbarInline({
  textareaRef,
  value,
  onChange,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  value: string
  onChange: (next: string) => void
}) {
  function insertMarkdown(prefix: string, suffix = '') {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selection = value.slice(start, end) || 'Text'
    const replacement = `${prefix}${selection}${suffix}`
    const next = value.slice(0, start) + replacement + value.slice(end)
    onChange(next)
    setTimeout(() => {
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selection.length)
      textarea.focus()
    }, 0)
  }

  return (
    <div className={styles.fansubEditMarkdownToolbar}>
      <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('# ')} title="Überschrift 1"><Heading1 size={14} /></button>
      <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('## ')} title="Überschrift 2"><Heading2 size={14} /></button>
      <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('**', '**')} title="Fett"><Bold size={14} /></button>
      <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('*', '*')} title="Kursiv"><Italic size={14} /></button>
      <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('- ')} title="Liste"><List size={14} /></button>
      <button type="button" className={styles.buttonSecondary} onClick={() => insertMarkdown('[', '](https://example.com)')} title="Link"><Link2 size={14} /></button>
    </div>
  )
}

// ─── Gruppennotiz-Editor ──────────────────────────────────────────────────────

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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-color, #ddd)', borderRadius: '6px' }}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}
      <div className={styles.field}>
        <label>Titel</label>
        <input value={draft.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Titel der Notiz" />
      </div>

      <div className={styles.field}>
        <label>Inhalt</label>
        <MarkdownToolbarInline textareaRef={textareaRef} value={draft.bodyMarkdown} onChange={(next) => onUpdate({ bodyMarkdown: next })} />
        <div className={styles.fansubEditMarkdownSplit}>
          <textarea ref={textareaRef} className={styles.fansubEditMarkdownTextarea} value={draft.bodyMarkdown} onChange={(e) => onUpdate({ bodyMarkdown: e.target.value })} placeholder="Markdown-Inhalt..." />
          <MarkdownPreview markdown={draft.bodyMarkdown} />
        </div>
        <p className={styles.fansubEditHint}>Zeichen: {draft.bodyMarkdown.length}{draft.bodyMarkdown.length > MARKDOWN_SOFT_LIMIT ? ' (Hinweis: sehr lang)' : ''}</p>
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
        {draft.id != null && (
          <button type="button" className={styles.buttonSecondary} style={{ color: 'var(--danger-color, #c0392b)' }} onClick={onDelete} disabled={draft.saving || draft.deleting}>
            <Trash2 size={14} />{draft.deleting ? 'Löschen...' : 'Löschen'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Mitgliedergeschichten-Editor ────────────────────────────────────────────

export function StoryEditor({
  draft,
  onUpdate,
  onSave,
  onDelete,
}: {
  draft: StoryDraft
  onUpdate: (partial: Partial<StoryDraft>) => void
  onSave: () => void
  onDelete: () => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div style={{ marginBottom: '1rem', padding: '1rem', border: '1px solid var(--border-color, #ddd)', borderRadius: '6px' }}>
      {draft.error ? <div className={styles.errorBox}>{draft.error}</div> : null}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label>Mitglieds-ID <span className={styles.fansubEditRequired}>*</span></label>
          <input type="number" value={draft.memberId} onChange={(e) => onUpdate({ memberId: e.target.value })} placeholder="Mitglieds-ID" min={1} />
        </div>
        <div className={styles.field} style={{ flex: '1', minWidth: '160px' }}>
          <label>Rollen-ID <span className={styles.fansubEditHint}>(optional)</span></label>
          <input type="number" value={draft.roleId} onChange={(e) => onUpdate({ roleId: e.target.value })} placeholder="Rollen-ID (optional)" min={1} />
        </div>
      </div>

      <div className={styles.field}>
        <label>Titel</label>
        <input value={draft.title} onChange={(e) => onUpdate({ title: e.target.value })} placeholder="Titel der Geschichte" />
      </div>

      <div className={styles.field}>
        <label>Inhalt</label>
        <MarkdownToolbarInline textareaRef={textareaRef} value={draft.bodyMarkdown} onChange={(next) => onUpdate({ bodyMarkdown: next })} />
        <div className={styles.fansubEditMarkdownSplit}>
          <textarea ref={textareaRef} className={styles.fansubEditMarkdownTextarea} value={draft.bodyMarkdown} onChange={(e) => onUpdate({ bodyMarkdown: e.target.value })} placeholder="Markdown-Inhalt..." />
          <MarkdownPreview markdown={draft.bodyMarkdown} />
        </div>
        <p className={styles.fansubEditHint}>Zeichen: {draft.bodyMarkdown.length}{draft.bodyMarkdown.length > MARKDOWN_SOFT_LIMIT ? ' (Hinweis: sehr lang)' : ''}</p>
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
        {draft.id != null && (
          <button type="button" className={styles.buttonSecondary} style={{ color: 'var(--danger-color, #c0392b)' }} onClick={onDelete} disabled={draft.saving || draft.deleting}>
            <Trash2 size={14} />{draft.deleting ? 'Löschen...' : 'Löschen'}
          </button>
        )}
      </div>
    </div>
  )
}
