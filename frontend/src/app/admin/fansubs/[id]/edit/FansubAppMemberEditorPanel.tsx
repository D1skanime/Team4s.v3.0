'use client'

import { Check } from 'lucide-react'

import {
  Button,
  Modal,
} from '@/components/ui'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type FansubAppMember,
  type FansubGroupMediaPermissions,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

const MEDIA_PERMISSION_OPTIONS: Array<{ key: keyof FansubGroupMediaPermissions; label: string; description: string }> = [
  { key: 'can_upload', label: 'Hochladen', description: 'Kann neue Gruppenmedien hinzufügen.' },
  { key: 'can_delete_own', label: 'Eigene archivieren', description: 'Kann selbst hochgeladene Gruppenmedien archivieren.' },
  { key: 'can_delete_all', label: 'Alle archivieren', description: 'Kann alle Gruppenmedien dieser Gruppe archivieren.' },
  { key: 'can_reorder', label: 'Reihenfolge ändern', description: 'Kann die Reihenfolge der Gruppenmedien ändern.' },
]

function styleNames(...names: Array<string | undefined | false>): string {
  return names.filter(Boolean).join(' ')
}

function getRoleClassName(role: string): string {
  if (role === 'fansub_lead') return styles.fansubEditRoleLead
  if (role === 'project_lead') return styles.fansubEditRoleProjectLead
  if (role === 'editor') return styles.fansubEditRoleEditor
  if (role === 'translator') return styles.fansubEditRoleTranslator
  if (role === 'timer') return styles.fansubEditRoleTimer
  if (role === 'typesetter') return styles.fansubEditRoleTypesetter
  if (role === 'quality_checker') return styles.fansubEditRoleQuality
  if (role === 'encoder') return styles.fansubEditRoleEncoder
  return styles.fansubEditRoleDefault
}

function countMediaPermissions(permissions: FansubGroupMediaPermissions): number {
  return MEDIA_PERMISSION_OPTIONS.filter((option) => permissions[option.key]).length
}

export type FansubAppMemberEditorPanelProps = {
  editorMember: FansubAppMember | null
  memberEditorTab: 'roles' | 'media'
  setMemberEditorTab: (tab: 'roles' | 'media') => void
  memberRoleDraft: string[]
  mediaPermissionDraft: FansubGroupMediaPermissions
  isBusy: boolean
  onClose: () => void
  onSave: () => void
  onToggleRole: (role: string) => void
  onToggleMediaPermission: (permission: keyof FansubGroupMediaPermissions) => void
}

export function FansubAppMemberEditorPanel({
  editorMember,
  memberEditorTab,
  setMemberEditorTab,
  memberRoleDraft,
  mediaPermissionDraft,
  isBusy,
  onClose,
  onSave,
  onToggleRole,
  onToggleMediaPermission,
}: FansubAppMemberEditorPanelProps) {
  const fansubName = editorMember?.member?.fansub_name

  return (
    <Modal
      open={Boolean(editorMember)}
      onClose={onClose}
      title="Mitglied bearbeiten"
      description={fansubName
        ? `Rollen und Medienrechte für ${fansubName} setzen.`
        : 'Rollen und Medienrechte für dieses Mitglied setzen.'
      }
      footer={editorMember ? (
        <div className={styles.fansubEditMemberEditorFooter}>
          <Button
            variant="ghost"
            className={styles.fansubEditMemberEditorCancelButton}
            disabled={isBusy}
            onClick={onClose}
          >
            Abbrechen
          </Button>
          <Button
            variant="primary"
            loading={isBusy}
            onClick={onSave}
          >
            Speichern
          </Button>
        </div>
      ) : null}
    >
      {editorMember ? (
        <div className={styles.fansubEditMemberEditor}>
          <div className={styles.fansubEditMemberEditorTabs} role="tablist" aria-label="Bearbeitungsbereiche">
            <button
              type="button"
              className={styleNames(
                styles.fansubEditMemberEditorTab,
                memberEditorTab === 'roles' && styles.fansubEditMemberEditorTabActive,
              )}
              role="tab"
              aria-selected={memberEditorTab === 'roles'}
              aria-controls="fansub-member-editor-roles"
              onClick={() => setMemberEditorTab('roles')}
            >
              Rollen · {memberRoleDraft.length}
            </button>
            <button
              type="button"
              className={styleNames(
                styles.fansubEditMemberEditorTab,
                memberEditorTab === 'media' && styles.fansubEditMemberEditorTabActive,
              )}
              role="tab"
              aria-selected={memberEditorTab === 'media'}
              aria-controls="fansub-member-editor-media"
              onClick={() => setMemberEditorTab('media')}
            >
              Medienrechte · {countMediaPermissions(mediaPermissionDraft)}
            </button>
          </div>

          {memberEditorTab === 'roles' ? (
            <section id="fansub-member-editor-roles" className={styles.fansubEditMemberEditorPanel} aria-label="Rollen">
              <p className={styles.fansubEditHint}>Aktive Rollen bestimmen, was dieses Mitglied ab jetzt in der Gruppe tun darf.</p>
              <div className={styles.fansubEditMemberRoleGrid}>
                {FANSUB_GROUP_ROLE_OPTIONS.map((option) => {
                  const enabled = memberRoleDraft.includes(option.code)
                  return (
                    <button
                      key={option.code}
                      type="button"
                      className={styleNames(
                        styles.fansubEditMemberRoleToggle,
                        getRoleClassName(option.code),
                        enabled && styles.fansubEditMemberRoleToggleSelected,
                      )}
                      aria-pressed={enabled}
                      onClick={() => onToggleRole(option.code)}
                      title={option.description}
                    >
                      {enabled ? <Check size={14} aria-hidden="true" /> : null}
                      <span>{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}

          {memberEditorTab === 'media' ? (
            <section id="fansub-member-editor-media" className={styles.fansubEditMemberEditorPanel} aria-label="Medienrechte">
              <p className={styles.fansubEditHint}>Diese Rechte gelten zusätzlich zu den Rollen dieses Mitglieds.</p>
              <div className={styles.fansubEditMediaSwitchList}>
                {MEDIA_PERMISSION_OPTIONS.map((option) => {
                  const enabled = mediaPermissionDraft[option.key]
                  return (
                    <button
                      key={option.key}
                      type="button"
                      role="switch"
                      aria-checked={enabled}
                      className={styleNames(styles.fansubEditMediaSwitchRow, enabled && styles.fansubEditMediaSwitchRowActive)}
                      onClick={() => onToggleMediaPermission(option.key)}
                    >
                      <span>
                        <strong>{option.label}</strong>
                        <small>{option.description}</small>
                      </span>
                      <span className={styles.fansubEditMediaSwitchTrack} aria-hidden="true">
                        <span />
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
