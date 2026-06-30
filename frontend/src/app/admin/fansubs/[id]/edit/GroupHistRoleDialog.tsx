'use client'

import {
  Button,
  ErrorState,
  FormField,
  Modal,
  Select,
  Textarea,
  YearPicker,
} from '@/components/ui'
import { type RoleDefinitionOption } from '@/types/admin-capability'
import { type HistFansubGroupMember } from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

export type RoleFormFields = {
  memberId: string
  roleCode: string
  startedYear: string
  endedYear: string
  note: string
}

export type GroupHistRoleDialogProps = {
  open: boolean
  onClose: () => void
  isEditing: boolean
  roleForm: RoleFormFields
  setRoleForm: (updater: (prev: RoleFormFields) => RoleFormFields) => void
  onSubmit: () => void
  isSaving: boolean
  error: string | null
  members: HistFansubGroupMember[]
  yearMin: number
  yearMax: number
  /** Frühere Funktionen aus der group_history-Quelle (Plan 03 / Plan 04) */
  historyRoleOptions: RoleDefinitionOption[]
  /** Optionaler Ladefehler für die group_history-Rollen */
  historyRoleLoadError?: string | null
}

export function GroupHistRoleDialog({
  open,
  onClose,
  isEditing,
  roleForm,
  setRoleForm,
  onSubmit,
  isSaving,
  error,
  members,
  yearMin,
  yearMax,
  historyRoleOptions,
  historyRoleLoadError,
}: GroupHistRoleDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Frühere Funktion bearbeiten' : 'Frühere Funktion hinzufügen'}
      description="Historische Funktion in der Gruppe dokumentieren — keine aktiven App-Rechte."
      footer={
        <div className={styles.fansubEditMembershipModalActions}>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Schließen
          </Button>
          <Button
            variant="success"
            loading={isSaving}
            onClick={onSubmit}
            disabled={!roleForm.memberId || !roleForm.roleCode.trim()}
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className={styles.fansubEditMembershipModalStack}>
        {error ? (
          <ErrorState
            title="Funktion konnte nicht gespeichert werden"
            description={error}
          />
        ) : null}

        {historyRoleLoadError ? (
          <ErrorState
            title="Frühere Funktionen konnten nicht geladen werden"
            description={historyRoleLoadError}
          />
        ) : null}

        <FormField label="Mitglied" htmlFor="member-role-member" required disabled={isEditing}>
          <Select
            id="member-role-member"
            value={roleForm.memberId}
            onChange={(e) => setRoleForm((f) => ({ ...f, memberId: e.target.value }))}
            aria-label="Mitglied auswählen"
            disabled={isEditing}
          >
            <option value="">Mitglied wählen</option>
            {members.map((member) => (
              <option key={member.id} value={String(member.id)}>
                {member.display_name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Frühere Funktion in der Gruppe" htmlFor="member-role-role" required>
          <Select
            id="member-role-role"
            value={roleForm.roleCode}
            onChange={(e) => setRoleForm((f) => ({ ...f, roleCode: e.target.value }))}
            aria-label="Frühere Funktion auswählen"
          >
            <option value="">Frühere Funktion wählen</option>
            {historyRoleOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label_de}
              </option>
            ))}
          </Select>
        </FormField>

        <div className={styles.fansubEditMembershipModalGrid}>
          <FormField label="Rolle von" htmlFor="member-role-started-year">
            <YearPicker
              id="member-role-started-year"
              label="Rolle von"
              value={roleForm.startedYear}
              minYear={yearMin}
              maxYear={yearMax}
              onChange={(year) => setRoleForm((f) => ({ ...f, startedYear: year }))}
            />
          </FormField>
          <FormField label="Rolle bis" htmlFor="member-role-ended-year">
            <YearPicker
              id="member-role-ended-year"
              label="Rolle bis"
              value={roleForm.endedYear}
              minYear={yearMin}
              maxYear={yearMax}
              onChange={(year) => setRoleForm((f) => ({ ...f, endedYear: year }))}
            />
          </FormField>
        </div>

        <FormField
          label="Notiz"
          htmlFor="member-role-note"
          hint="Optionaler Kontext für spätere Prüfung oder Einordnung."
        >
          <Textarea
            id="member-role-note"
            value={roleForm.note}
            onChange={(e) => setRoleForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="Ergänzende Anmerkung"
            aria-label="Notiz"
            rows={3}
          />
        </FormField>
      </div>
    </Modal>
  )
}
