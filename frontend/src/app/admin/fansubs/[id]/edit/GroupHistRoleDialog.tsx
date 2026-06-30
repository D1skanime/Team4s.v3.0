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
import { FANSUB_GROUP_ROLE_OPTIONS, type HistFansubGroupMember } from '@/types/fansub'

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
  roleOptions?: typeof FANSUB_GROUP_ROLE_OPTIONS
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
  roleOptions = FANSUB_GROUP_ROLE_OPTIONS,
}: GroupHistRoleDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? 'Rolle bearbeiten' : 'Rolle hinzufügen'}
      description="Historische Gruppenrolle für ein Mitglied anlegen oder bearbeiten."
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
            title="Rolle konnte nicht gespeichert werden"
            description={error}
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

        <FormField label="Rolle" htmlFor="member-role-role" required>
          <Select
            id="member-role-role"
            value={roleForm.roleCode}
            onChange={(e) => setRoleForm((f) => ({ ...f, roleCode: e.target.value }))}
            aria-label="Rolle auswählen"
          >
            <option value="">Rolle auswählen</option>
            {roleOptions.map((option) => (
              <option key={option.code} value={option.code}>
                {option.label}
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
