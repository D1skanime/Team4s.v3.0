'use client'

import { Check } from 'lucide-react'

import {
  Button,
  DatePicker,
  ErrorState,
  FormField,
  Modal,
  Select,
} from '@/components/ui'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import {
  type FansubAppMember,
  type FansubGroupMediaPermissions,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'
import type { InlineMemberRoleDraft } from './useGroupMembersTab'

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

function countMediaPermissions(permissions: FansubGroupMediaPermissions): number {
  return MEDIA_PERMISSION_OPTIONS.filter((option) => permissions[option.key]).length
}

export type FansubAppMemberEditorTab = 'roles' | 'media' | 'history'

export type FansubAppMemberEditorPanelProps = {
  editorMember: FansubAppMember | null
  memberEditorTab: FansubAppMemberEditorTab
  setMemberEditorTab: (tab: FansubAppMemberEditorTab) => void
  memberRoleDraft: string[]
  roleOptions: RoleDefinitionOption[]
  roleOptionsError?: string | null
  mediaPermissionDraft: FansubGroupMediaPermissions
  historicalRoleDrafts: InlineMemberRoleDraft[]
  historyRoleOptions: RoleDefinitionOption[]
  historyRoleLoadError?: string | null
  canManageHistoricalRoles: boolean
  historicalRoleCount: number
  yearMin: number
  yearMax: number
  isBusy: boolean
  onClose: () => void
  onSave: () => void
  onToggleRole: (role: string) => void
  onToggleMediaPermission: (permission: keyof FansubGroupMediaPermissions) => void
  onAddHistoricalRole: () => void
  onUpdateHistoricalRole: (id: string, patch: Partial<InlineMemberRoleDraft>) => void
  onRemoveHistoricalRole: (id: string) => void
}

export function FansubAppMemberEditorPanel({
  editorMember,
  memberEditorTab,
  setMemberEditorTab,
  memberRoleDraft,
  roleOptions,
  roleOptionsError,
  mediaPermissionDraft,
  historicalRoleDrafts,
  historyRoleOptions,
  historyRoleLoadError,
  canManageHistoricalRoles,
  historicalRoleCount,
  yearMin,
  yearMax,
  isBusy,
  onClose,
  onSave,
  onToggleRole,
  onToggleMediaPermission,
  onAddHistoricalRole,
  onUpdateHistoricalRole,
  onRemoveHistoricalRole,
}: FansubAppMemberEditorPanelProps) {
  const fansubName = editorMember?.member?.fansub_name
  const hasMemberAnchor = Boolean(editorMember?.member?.member_id)

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
              Aktive Rolle in der Fansubgruppe · {memberRoleDraft.length}
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
            <button
              type="button"
              className={styleNames(
                styles.fansubEditMemberEditorTab,
                memberEditorTab === 'history' && styles.fansubEditMemberEditorTabActive,
              )}
              role="tab"
              aria-selected={memberEditorTab === 'history'}
              aria-controls="fansub-member-editor-history"
              onClick={() => setMemberEditorTab('history')}
            >
              Historische Rollen · {historicalRoleCount}
            </button>
          </div>

          {memberEditorTab === 'roles' ? (
            <section id="fansub-member-editor-roles" className={styles.fansubEditMemberEditorPanel} aria-label="Aktive Rolle in der Fansubgruppe">
              <p className={styles.fansubEditHint}>Aktive Rollen bestimmen, was dieses Mitglied ab jetzt in der Gruppe tun darf.</p>
              {roleOptionsError ? <ErrorState title="Rollen konnten nicht geladen werden" description={roleOptionsError} /> : null}
              <div className={styles.fansubEditMemberRoleGroups}>
                {roleOptions.length > 0 ? (
                  <section className={styles.fansubEditMemberRoleGroup} aria-label="Zuweisbare Rollen">
                    <div className={styles.fansubEditMemberRoleGrid}>
                      {roleOptions.map((option) => {
                        const enabled = memberRoleDraft.includes(option.code)
                        return (
                          <button
                            key={option.code}
                            type="button"
                            className={styleNames(
                              styles.fansubEditMemberRoleToggle,
                              styles.fansubEditRoleDefault,
                              enabled && styles.fansubEditMemberRoleToggleSelected,
                            )}
                            aria-pressed={enabled}
                            onClick={() => onToggleRole(option.code)}
                          >
                            {enabled ? <Check size={14} aria-hidden="true" /> : null}
                            <span>{option.label_de}</span>
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ) : null}
              </div>
              {roleOptions.some((option) => memberRoleDraft.includes(option.code) && option.has_operative_capabilities === false) ? (
                <p className={styles.fansubEditHint} role="status">Diese Rolle verleiht aktuell keine zusätzlichen Rechte.</p>
              ) : null}
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

          {memberEditorTab === 'history' ? (
            <section id="fansub-member-editor-history" className={styles.fansubEditMemberEditorPanel} aria-label="Historische Rollen">
              <p className={styles.fansubEditHint}>Historische Rollen dokumentieren frühere Funktionen dieser Person. Sie geben keine aktiven Rechte.</p>
              {historyRoleLoadError ? (
                <ErrorState title="Frühere Funktionen konnten nicht geladen werden" description={historyRoleLoadError} />
              ) : null}
              {!hasMemberAnchor ? (
                <ErrorState
                  title="Kein Fansub-Profil verknüpft"
                  description="Für dieses App-Mitglied fehlt die Member-ID, deshalb können keine historischen Rollen angelegt werden."
                />
              ) : null}
              <div className={styles.fansubEditMemberHistoryRoleCard}>
                {historicalRoleDrafts.map((role, index) => (
                  <div className={styleNames(styles.fansubEditInlineRoleRow, styles.fansubEditMemberHistoryRoleRow)} key={role.id}>
                  <FormField label={`Rolle ${index + 1}`} htmlFor={`app-member-history-role-${role.id}`} required>
                    <Select
                      id={`app-member-history-role-${role.id}`}
                      value={role.roleCode}
                      onChange={(event) => onUpdateHistoricalRole(role.id, { roleCode: event.target.value })}
                      disabled={!canManageHistoricalRoles || !hasMemberAnchor}
                    >
                      <option value="">Rolle wählen</option>
                      {historyRoleOptions.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.label_de}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  <FormField label="Eintrittsdatum" htmlFor={`app-member-history-start-${role.id}`}>
                    <DatePicker
                      id={`app-member-history-start-${role.id}`}
                      label={`Rolle ${index + 1} Eintrittsdatum`}
                      value={role.startedDate}
                      onChange={(value) => onUpdateHistoricalRole(role.id, { startedDate: value })}
                      minYear={yearMin}
                      maxYear={yearMax}
                      maxDate={role.endedDate || undefined}
                      disabled={!canManageHistoricalRoles || !hasMemberAnchor}
                    />
                  </FormField>
                  <FormField label="Austrittsdatum" htmlFor={`app-member-history-end-${role.id}`}>
                    <DatePicker
                      id={`app-member-history-end-${role.id}`}
                      label={`Rolle ${index + 1} Austrittsdatum`}
                      value={role.endedDate}
                      onChange={(value) => onUpdateHistoricalRole(role.id, { endedDate: value })}
                      minYear={yearMin}
                      maxYear={yearMax}
                      minDate={role.startedDate || undefined}
                      disabled={!canManageHistoricalRoles || !hasMemberAnchor}
                    />
                  </FormField>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={styles.fansubEditDangerOutlineButton}
                    onClick={() => onRemoveHistoricalRole(role.id)}
                    disabled={!canManageHistoricalRoles || historicalRoleDrafts.length <= 1}
                  >
                    Entfernen
                  </Button>
                  </div>
                ))}
                <div className={styles.fansubEditInlineRoleFooter}>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={onAddHistoricalRole}
                    disabled={!canManageHistoricalRoles || !hasMemberAnchor}
                  >
                    Weitere Rolle hinzufügen
                  </Button>
                </div>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </Modal>
  )
}
