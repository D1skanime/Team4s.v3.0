'use client'

import { useEffect, useMemo, useState } from 'react'

import {
  Button,
  Card,
  DatePicker,
  ErrorState,
  FormField,
  Input,
  Modal,
  Select,
  Switch,
} from '@/components/ui'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import type { HistFansubGroupMember, HistoricalContributionVisibility } from '@/types/fansub'
import { findDuplicateMemberMatches, type InlineMemberRoleDraft } from './useGroupMembersTab'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

export type MemberFormFields = {
  displayName: string
  joinedDate: string
  leftDate: string
  visibility: HistoricalContributionVisibility
}

export type GroupMemberFormModalsProps = {
  // Mitglied anlegen/bearbeiten Modal
  modalOpen: boolean
  editTarget: HistFansubGroupMember | null
  form: MemberFormFields
  setForm: (updater: (prev: MemberFormFields) => MemberFormFields) => void
  inlineRoleDrafts: InlineMemberRoleDraft[]
  setInlineRoleDrafts: (updater: (prev: InlineMemberRoleDraft[]) => InlineMemberRoleDraft[]) => void
  historyRoleOptions: RoleDefinitionOption[]
  historyRoleLoadError?: string | null
  existingMembers: HistFansubGroupMember[]
  saving: boolean
  modalError: string | null
  onClose: () => void
  onSave: () => void
  yearMin: number
  yearMax: number
  // Mitglied löschen Modal
  deleteTarget: HistFansubGroupMember | null
  deleting: boolean
  deleteError: string | null
  onCloseDelete: () => void
  onConfirmDelete: () => void
  // Rolle löschen Modal
  roleDeleteTarget: { role_label?: string | null; role_code: string; member_display_name: string } | null
  roleDeleting: boolean
  roleDeleteError: string | null
  onCloseRoleDelete: () => void
  onConfirmRoleDelete: () => void
  roleLabelForCode: (code: string) => string
}

export function GroupMemberFormModals({
  modalOpen,
  editTarget,
  form,
  setForm,
  inlineRoleDrafts,
  setInlineRoleDrafts,
  historyRoleOptions,
  historyRoleLoadError,
  existingMembers,
  saving,
  modalError,
  onClose,
  onSave,
  deleteTarget,
  deleting,
  deleteError,
  onCloseDelete,
  onConfirmDelete,
  yearMin,
  yearMax,
  roleDeleteTarget,
  roleDeleting,
  roleDeleteError,
  onCloseRoleDelete,
  onConfirmRoleDelete,
  roleLabelForCode,
}: GroupMemberFormModalsProps) {
  const hasRequiredRole = inlineRoleDrafts.some((role) => role.roleCode.trim())
  const [duplicateConfirmed, setDuplicateConfirmed] = useState(false)

  useEffect(() => {
    setDuplicateConfirmed(false)
  }, [form.displayName])

  const duplicateMatches = useMemo(
    () => (editTarget ? [] : findDuplicateMemberMatches(existingMembers, form.displayName)),
    [editTarget, existingMembers, form.displayName],
  )

  const canSave = Boolean(form.displayName.trim())
    && hasRequiredRole
    && (duplicateMatches.length === 0 || duplicateConfirmed)

  const addInlineRole = () => {
    setInlineRoleDrafts((current) => [
      ...current,
      { id: `role-${current.length + 1}-${Date.now()}`, roleCode: '', startedDate: '', endedDate: '' },
    ])
  }

  const updateInlineRole = (id: string, patch: Partial<InlineMemberRoleDraft>) => {
    setInlineRoleDrafts((current) => current.map((role) => (role.id === id ? { ...role, ...patch } : role)))
  }

  const removeInlineRole = (id: string) => {
    setInlineRoleDrafts((current) => current.filter((role) => role.id !== id))
  }

  return (
    <>
      <Modal
        open={modalOpen}
        onClose={onClose}
        title={editTarget ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}
        description="Historisches Mitglied der Fansubgruppe anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              Schließen
            </Button>
            <Button
              variant="success"
              loading={saving}
              onClick={onSave}
              disabled={!canSave}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {modalError ? (
            <ErrorState
              title="Mitglied konnte nicht gespeichert werden"
              description={modalError}
            />
          ) : null}

          <FormField label="Anzeigename" htmlFor="hist-member-display-name" required>
            <Input
              id="hist-member-display-name"
              type="text"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              placeholder="z. B. Sora"
              required
            />
          </FormField>

          {duplicateMatches.length > 0 ? (
            <Card variant="nested" className={styles.warningBox}>
              <p>
                Ein Mitglied mit diesem Namen existiert bereits:{' '}
                <strong>{duplicateMatches[0].member.display_name}</strong>{' '}
                ({duplicateMatches[0].isActiveLinked ? 'aktiv/verknüpft' : 'historisch'})
                {duplicateMatches.length > 1 ? (
                  duplicateMatches.length === 2
                    ? ' und 1 weiterer Eintrag'
                    : ` und ${duplicateMatches.length - 1} weitere Einträge`
                ) : null}
                {' '}– trotzdem als neuen Eintrag anlegen?
              </p>
              <Switch
                checked={duplicateConfirmed}
                onCheckedChange={setDuplicateConfirmed}
                label="Ja, trotzdem als neuen Eintrag anlegen"
              />
            </Card>
          ) : null}

          <FormField label="Sichtbarkeit" htmlFor="hist-member-visibility">
            <Select
              id="hist-member-visibility"
              value={form.visibility}
              onChange={(e) => setForm((f) => ({
                ...f,
                visibility: e.target.value as HistoricalContributionVisibility,
              }))}
            >
              <option value="internal">intern</option>
              <option value="public">öffentlich</option>
            </Select>
          </FormField>

          <section className={styles.fansubEditInlineRolePanel} aria-label="Frühere Funktionen">
            <div className={styles.fansubEditInlineRoleHeader}>
              <div>
                <h3>Frühere Funktionen</h3>
                <p>Historische Rollen mit Eintritts- und optionalem Austrittsdatum.</p>
              </div>
            </div>

            {historyRoleLoadError ? (
              <ErrorState title="Frühere Funktionen konnten nicht geladen werden" description={historyRoleLoadError} />
            ) : null}

            {inlineRoleDrafts.map((role, index) => (
              <div className={styles.fansubEditInlineRoleRow} key={role.id}>
                <FormField label={`Rolle ${index + 1}`} htmlFor={`hist-member-role-${role.id}`} required>
                  <Select
                    id={`hist-member-role-${role.id}`}
                    value={role.roleCode}
                    onChange={(event) => updateInlineRole(role.id, { roleCode: event.target.value })}
                  >
                    <option value="">Rolle wählen</option>
                    {historyRoleOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.label_de}
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Eintrittsdatum" htmlFor={`hist-member-role-start-${role.id}`}>
                  <DatePicker
                    id={`hist-member-role-start-${role.id}`}
                    label={`Rolle ${index + 1} Eintrittsdatum`}
                    value={role.startedDate}
                    onChange={(value) => updateInlineRole(role.id, { startedDate: value })}
                    minYear={yearMin}
                    maxYear={yearMax}
                    maxDate={role.endedDate || undefined}
                  />
                </FormField>
                <FormField label="Austrittsdatum" htmlFor={`hist-member-role-end-${role.id}`}>
                  <DatePicker
                    id={`hist-member-role-end-${role.id}`}
                    label={`Rolle ${index + 1} Austrittsdatum`}
                    value={role.endedDate}
                    onChange={(value) => updateInlineRole(role.id, { endedDate: value })}
                    minYear={yearMin}
                    maxYear={yearMax}
                    minDate={role.startedDate || undefined}
                    panelAlign="end"
                  />
                </FormField>
                <Button
                  type="button"
                  variant={inlineRoleDrafts.length <= 1 ? 'ghost' : 'danger'}
                  size="sm"
                  onClick={() => removeInlineRole(role.id)}
                  disabled={inlineRoleDrafts.length <= 1}
                >
                  Entfernen
                </Button>
              </div>
            ))}
            <div className={styles.fansubEditInlineRoleFooter}>
              <Button type="button" variant="secondary" size="sm" onClick={addInlineRole}>
                Weitere Rolle hinzufügen
              </Button>
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={onCloseDelete}
        title="Mitglied löschen"
        description="Dieses historische Mitglied wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={onCloseDelete} disabled={deleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={onConfirmDelete}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        {deleteError ? (
          <ErrorState title="Mitglied konnte nicht gelöscht werden" description={deleteError} />
        ) : null}
        {deleteTarget ? (
          <p className={styles.fansubEditMembershipDeleteText}>
            <strong>{deleteTarget.display_name}</strong> aus der historischen Mitgliederliste entfernen.
          </p>
        ) : null}
      </Modal>

      <Modal
        open={roleDeleteTarget !== null}
        onClose={onCloseRoleDelete}
        title="Rolleneintrag löschen"
        description="Diese Änderung entfernt den historischen Rolleneintrag aus der Gruppenhistorie."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={onCloseRoleDelete} disabled={roleDeleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={roleDeleting}
              onClick={onConfirmRoleDelete}
            >
              Endgültig löschen
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {roleDeleteError ? (
            <ErrorState title="Rolle konnte nicht gelöscht werden" description={roleDeleteError} />
          ) : null}
          {roleDeleteTarget ? (
            <p className={styles.fansubEditMembershipDeleteText}>
              Rolle <strong>{roleDeleteTarget.role_label ?? roleLabelForCode(roleDeleteTarget.role_code)}</strong> von {roleDeleteTarget.member_display_name} entfernen.
            </p>
          ) : null}
        </div>
      </Modal>
    </>
  )
}
