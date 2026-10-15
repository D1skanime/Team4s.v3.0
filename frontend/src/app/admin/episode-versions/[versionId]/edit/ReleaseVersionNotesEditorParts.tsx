import { Pencil } from 'lucide-react'

import { RichTextEditor } from '@/components/editor'
import { RichTextRenderer } from '@/components/editor/RichTextRenderer'
import { Badge, Button, FormField, Input } from '@/components/ui'
import { ROLE_CATALOG_CHIP_CLASS, labelForRole, presentationForRole } from '@/lib/roleCatalog'
import type { RoleDefinitionOption } from '@/types/admin-capability'
import type { MemberRoleForVersion } from '@/types/releaseVersionNotes'

import { styles } from './ReleaseVersionNotesTab'
import {
  buildKey,
  canEditMemberRole,
  collectPlainText,
  ensureRichTextValue,
  formatCharacterStatus,
  formatLastActivity,
  getInitials,
  getPlainTextLength,
  type NoteFormState,
} from './ReleaseVersionNotesTab.helpers'

const CHAR_WARN_LIMIT = 2000

const REJECTION_CATEGORY_LABELS: Record<string, string> = {
  'content.incorrect': 'Inhaltlich falsch',
  'release_context.wrong': 'Falscher Release-Kontext',
  'quality.insufficient': 'Qualität unzureichend',
  'rights.unclear': 'Quelle oder Rechte unklar',
  other: 'Sonstiger Grund',
}

interface MemberEditorBodyProps {
  memberId: number
  memberName: string
  roles: MemberRoleForVersion[]
  catalog: readonly RoleDefinitionOption[]
  noteStates: Record<string, NoteFormState>
  savingKeys: Record<string, boolean>
  recentlySavedKey: string | null
  editingRoleKeys: Record<string, boolean>
  tagLabel: string
  onUpdateField: <K extends keyof NoteFormState>(key: string, field: K, value: NoteFormState[K]) => void
  onResetRole: (memberRole: MemberRoleForVersion) => void
  onStartEditing: (memberRole: MemberRoleForVersion) => void
  onSaveRole: (memberRole: MemberRoleForVersion) => void
}

export function MemberEditorBody({
  memberId,
  memberName,
  roles,
  catalog,
  noteStates,
  savingKeys,
  recentlySavedKey,
  editingRoleKeys,
  tagLabel,
  onUpdateField,
  onResetRole,
  onStartEditing,
  onSaveRole,
}: MemberEditorBodyProps) {
  return (
    <div className={styles.memberEditorBody}>
      <div className={styles.memberEditorHeader}>
        <span className={styles.memberAvatar} aria-hidden="true">{getInitials(memberName)}</span>
        <div>
          <p className={styles.memberCardMeta}>Mitglied</p>
          <h3 className={styles.memberCardTitle}>{memberName}</h3>
        </div>
        <Badge variant={tagLabel === 'Eigene Rolle' ? 'success' : 'info'}>{tagLabel}</Badge>
      </div>
      <div className={styles.roleList}>
        {roles.map((memberRole) => {
          const key = buildKey(memberId, memberRole.roleId)
          const canEdit = canEditMemberRole(memberRole)
          return (
            <RoleNoteField
              key={key}
              memberRole={memberRole}
              catalog={catalog}
              state={noteStates[key]}
              isSaving={savingKeys[key] === true}
              isRecentlySaved={recentlySavedKey === key}
              isEditing={editingRoleKeys[key] === true}
              canEdit={canEdit}
              onUpdate={onUpdateField}
              onReset={() => onResetRole(memberRole)}
              onStartEdit={() => onStartEditing(memberRole)}
              onSave={() => onSaveRole(memberRole)}
            />
          )
        })}
      </div>
    </div>
  )
}

interface RoleNoteFieldProps {
  memberRole: MemberRoleForVersion
  catalog: readonly RoleDefinitionOption[]
  state: NoteFormState | undefined
  isSaving: boolean
  isRecentlySaved: boolean
  isEditing: boolean
  canEdit: boolean
  onUpdate: <K extends keyof NoteFormState>(key: string, field: K, value: NoteFormState[K]) => void
  onReset: () => void
  onStartEdit: () => void
  onSave: () => void
}

export function RoleNoteField({ memberRole, catalog, state, isSaving, isRecentlySaved, isEditing, canEdit, onUpdate, onReset, onStartEdit, onSave }: RoleNoteFieldProps) {
  const key = buildKey(memberRole.memberId, memberRole.roleId)
  const label = labelForRole(catalog, memberRole.roleCode)
  const presentation = presentationForRole(catalog, memberRole.roleCode)
  const placeholder = 'Noch keine Notiz - kurz ergänzen?'
  const charCount = getPlainTextLength(state?.bodyJson ?? null)
  const isOverLimit = charCount >= CHAR_WARN_LIMIT
  const hasSavedNote = (state?.id ?? 0) > 0
  const plainText = collectPlainText(state?.bodyJson ?? null).trim()
  const shouldShowViewMode = hasSavedNote && !isEditing
  const shouldShowReadonlyEmpty = !canEdit && !hasSavedNote
  const lifecycleActivity = formatLastActivity(state?.lastActivityAt ?? null)

  return (
    <div className={styles.roleCard}>
      <div className={styles.roleCardHeader}>
        <div className={styles.roleCardHeading}>
          <p className={styles.roleLabelEyebrow}>Rolle</p>
        </div>
        <Badge
          variant="neutral"
          className={ROLE_CATALOG_CHIP_CLASS}
          data-color-key={presentation.colorKey}
        >
          {label}
        </Badge>
      </div>

      {shouldShowViewMode || shouldShowReadonlyEmpty ? (
        <>
          <div className={styles.notePreview}>
            {state?.title ? <p className={styles.notePreviewTitle}>{state.title}</p> : null}
            {state?.bodyHtml?.trim() ? (
              <RichTextRenderer bodyHtml={state.bodyHtml} />
            ) : (
              <p className={plainText ? styles.notePreviewText : styles.notePreviewEmpty}>
                {plainText || 'Noch keine Notiz hinterlegt.'}
              </p>
            )}
            {hasSavedNote ? (
              <div className={styles.notePreviewMeta}>
                {state?.reviewState === 'pending' ? <Badge variant="warning">In Prüfung</Badge> : null}
                {state?.reviewState === 'rejected' ? <Badge variant="danger">Abgelehnt</Badge> : null}
                {state?.reviewState === 'confirmed' ? <Badge variant="success">Bestätigt</Badge> : null}
                {state?.reviewState === 'confirmed' && state.visibility === 'public' ? (
                  <Badge variant="success">Öffentlich</Badge>
                ) : null}
                {!state?.reviewState ? (
                  <>
                    <Badge variant={state?.visibility === 'public' ? 'info' : 'muted'}>
                      {state?.visibility === 'public' ? 'öffentlich' : 'intern'}
                    </Badge>
                    <Badge variant={state?.status === 'published' ? 'success' : 'neutral'}>
                      {state?.status === 'published' ? 'Veröffentlicht' : state?.status === 'archived' ? 'Archiviert' : state?.status === 'deleted' ? 'Gelöscht' : 'Entwurf'}
                    </Badge>
                  </>
                ) : null}
              </div>
            ) : null}
            {lifecycleActivity ? (
              <p className={styles.notePreviewEmpty}>Letzte Aktivität: {lifecycleActivity}</p>
            ) : null}
            {state?.reviewState === 'rejected' ? (
              <div className={styles.notePreviewMeta} role="status">
                <Badge variant="danger">
                  {REJECTION_CATEGORY_LABELS[state.rejectionCategory ?? 'other'] ?? 'Sonstiger Grund'}
                </Badge>
                {state.rejectionReason ? <p className={styles.notePreviewText}>{state.rejectionReason}</p> : null}
              </div>
            ) : null}
          </div>
          <div className={styles.roleActions}>
            {canEdit && hasSavedNote ? (
              <Button variant="secondary" type="button" onClick={onStartEdit}>
                <Pencil size={15} aria-hidden="true" />
                Bearbeiten
              </Button>
            ) : null}
            {canEdit && state?.reviewState === 'rejected' ? (
              <Button variant="success" type="button" loading={isSaving} onClick={onSave}>
                Erneut einreichen
              </Button>
            ) : null}
          </div>
        </>
      ) : (
        <>
      <FormField label="Titel (optional)">
        <Input
          type="text"
          value={state?.title ?? ''}
          onChange={(e) => onUpdate(key, 'title', e.target.value)}
          disabled={!canEdit}
        />
      </FormField>

      <RichTextEditor
        value={ensureRichTextValue(state?.bodyJson ?? null)}
        onChange={(value) => {
          if (canEdit) onUpdate(key, 'bodyJson', value)
        }}
        placeholder={placeholder}
        mode="shortnote"
        toolbarVariant="minimal"
        showShortnoteHint={false}
        minHeight={118}
        disabled={!canEdit}
      />

      <div className={styles.charFooter}>
        <span className={`${styles.charHint} ${isOverLimit ? styles.charHintWarning : ''}`}>
          {isOverLimit ? `Empfohlene Länge überschritten (${CHAR_WARN_LIMIT} Zeichen)` : formatCharacterStatus(charCount)}
        </span>
      </div>

      <div className={styles.roleActions}>
        <Button variant="ghost" type="button" onClick={onReset} disabled={!canEdit || isSaving || !state?.isDirty}>
          Abbrechen
        </Button>
        <Button variant="success" type="button" loading={isSaving} onClick={onSave} disabled={!canEdit}>
          {isRecentlySaved ? 'Gespeichert ✓' : isSaving ? 'Speichert...' : state?.reviewState === 'rejected' ? 'Erneut einreichen' : 'Speichern'}
        </Button>
      </div>
        </>
      )}
    </div>
  )
}
