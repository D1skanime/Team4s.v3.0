'use client'

import {
  Button,
  ErrorState,
  FormField,
  Input,
  Modal,
  Select,
} from '@/components/ui'
import type { HistFansubGroupMember, HistoricalContributionVisibility } from '@/types/fansub'

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
  saving,
  modalError,
  onClose,
  onSave,
  deleteTarget,
  deleting,
  deleteError,
  onCloseDelete,
  onConfirmDelete,
  roleDeleteTarget,
  roleDeleting,
  roleDeleteError,
  onCloseRoleDelete,
  onConfirmRoleDelete,
  roleLabelForCode,
}: GroupMemberFormModalsProps) {
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
              disabled={!form.displayName.trim()}
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

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField label="Beitrittsdatum" htmlFor="hist-member-joined-date" hint="Optionaler Startpunkt der Mitgliedschaft.">
              <Input
                id="hist-member-joined-date"
                type="date"
                value={form.joinedDate}
                onChange={(e) => setForm((f) => ({ ...f, joinedDate: e.target.value }))}
                aria-label="Beitrittsdatum"
              />
            </FormField>

            <FormField label="Austrittsdatum" htmlFor="hist-member-left-date" hint="Leer lassen, wenn die Person weiterhin aktiv ist.">
              <Input
                id="hist-member-left-date"
                type="date"
                value={form.leftDate}
                onChange={(e) => setForm((f) => ({ ...f, leftDate: e.target.value }))}
                aria-label="Austrittsdatum"
              />
            </FormField>
          </div>

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
