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
  FANSUB_GROUP_ROLE_OPTIONS,
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

const ACTIVE_ROLE_GROUPS = [
  { label: 'Leitung', codes: ['fansub_lead', 'project_lead'] },
  { label: 'Übersetzung & Text', codes: ['translator', 'timer', 'typesetter', 'editor'] },
  { label: 'Technik & Quelle', codes: ['encoder', 'raw_provider', 'quality_checker', 'techadmin'] },
  { label: 'Gestaltung', codes: ['designer', 'gfxler'] },
] as const

const GROUPED_ACTIVE_ROLE_OPTIONS = (() => {
  const optionsByCode = new Map(FANSUB_GROUP_ROLE_OPTIONS.map((option) => [option.code, option]))
  const usedCodes = new Set<string>()
  const groups = ACTIVE_ROLE_GROUPS.map((group) => {
    const options = group.codes.flatMap((code) => {
      const option = optionsByCode.get(code)
      if (!option) return []
      usedCodes.add(code)
      return [option]
    })
    return { label: group.label, options }
  }).filter((group) => group.options.length > 0)

  const ungroupedOptions = FANSUB_GROUP_ROLE_OPTIONS.filter((option) => !usedCodes.has(option.code))
  // Neue aktive Rollen ohne fachliche Zuordnung landen sichtbar hier, bis die Gruppierung erweitert wird.
  return ungroupedOptions.length > 0 ? [...groups, { label: 'Weitere', options: ungroupedOptions }] : groups
})()

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

export type FansubAppMemberEditorTab = 'roles' | 'media' | 'history'

export type FansubAppMemberEditorPanelProps = {
  editorMember: FansubAppMember | null
  memberEditorTab: FansubAppMemberEditorTab
  setMemberEditorTab: (tab: FansubAppMemberEditorTab) => void
  memberRoleDraft: string[]
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
              <div className={styles.fansubEditMemberRoleGroups}>
                {GROUPED_ACTIVE_ROLE_OPTIONS.map((group) => (
                  <section className={styles.fansubEditMemberRoleGroup} key={group.label} aria-label={group.label}>
                    <h3>{group.label}</h3>
                    <div className={styles.fansubEditMemberRoleGrid}>
                      {group.options.map((option) => {
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
                ))}
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
