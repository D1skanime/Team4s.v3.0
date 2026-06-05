'use client'

import { useCallback, useEffect, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  LoadingState,
  Modal,
  SectionHeader,
  Select,
  Textarea,
  Toolbar,
  YearPicker,
} from '@/components/ui'
import {
  ApiError,
  createMemberRole,
  deleteMemberRole,
  listGroupMembers,
  listMemberRoles,
  updateMemberRole,
} from '@/lib/api'
import type {
  CreateMemberRoleRequest,
  HistFansubGroupMember,
  HistGroupMemberRole,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type MemberRolesTabProps = {
  fansubId: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_MIN = 1980

const GROUP_HISTORY_ROLE_OPTIONS = [
  { code: 'founder', label: 'Gründer/in' },
  { code: 'leader', label: 'Gruppenleitung' },
  { code: 'co_leader', label: 'Co-Leitung' },
  { code: 'project_lead', label: 'Projektleitung' },
  { code: 'project_manager', label: 'Projektmanagement' },
]

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_year ?? '?'
  const bis = role.ended_year ?? 'heute'
  return `${von} – ${bis}`
}

function statusBadgeVariant(status: HistGroupMemberRole['status']): 'success' | 'info' {
  return status === 'confirmed' ? 'success' : 'info'
}

function statusLabel(status: HistGroupMemberRole['status']): string {
  return status === 'confirmed' ? 'Bestätigt' : 'Historisch'
}

function roleLabelForCode(code: string): string {
  return GROUP_HISTORY_ROLE_OPTIONS.find((option) => option.code === code)?.label ?? code
}

type FormFields = {
  memberId: string
  roleCode: string
  startedYear: string
  endedYear: string
  note: string
  status: 'historical' | 'confirmed'
}

const EMPTY_FORM: FormFields = {
  memberId: '',
  roleCode: '',
  startedYear: '',
  endedYear: '',
  note: '',
  status: 'historical',
}

function statusHelpText(status: FormFields['status']): string {
  if (status === 'confirmed') {
    return 'Bestätigt: Diese Rolle ist für die Gruppenhistorie geprüft.'
  }
  return 'Historisch: Der Rolleneintrag gehört zur Timeline, ist aber noch nicht final bestätigt.'
}

function roleToForm(role: HistGroupMemberRole): FormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedYear: role.started_year != null ? String(role.started_year) : '',
    endedYear: role.ended_year != null ? String(role.ended_year) : '',
    note: role.note ?? '',
    status: role.status,
  }
}

export function MemberRolesTab({ fansubId }: MemberRolesTabProps) {
  const [roles, setRoles] = useState<HistGroupMemberRole[]>([])
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HistGroupMemberRole | null>(null)
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HistGroupMemberRole | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const membersRes = await listGroupMembers(fansubId)
      const allMembers = membersRes.data ?? []
      const roleResponses = await Promise.all(
        allMembers.map((m) => listMemberRoles(fansubId, m.id))
      )
      const allRoles = roleResponses.flatMap((r, index) =>
        (r.data ?? []).map((role) => ({
          ...role,
          member_display_name: role.member_display_name || allMembers[index]?.display_name || '',
        }))
      )
      const sorted = [...allRoles].sort((a, b) => {
        const ay = a.started_year ?? 0
        const by = b.started_year ?? 0
        return by - ay
      })
      setRoles(sorted)
      setMembers(allMembers)
    } catch (err) {
      setError(formatApiError(err, 'Rollen konnten nicht geladen werden.'))
    } finally {
      setLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void load()
  }, [load])

  function openNew() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }

  function openEdit(role: HistGroupMemberRole) {
    setEditTarget(role)
    setForm(roleToForm(role))
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
    setModalError(null)
  }

  function openDelete(role: HistGroupMemberRole) {
    setDeleteTarget(role)
    setDeleteError(null)
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  async function handleSave() {
    if (!form.memberId) {
      setModalError('Bitte ein Mitglied auswählen.')
      return
    }
    if (!form.roleCode.trim()) {
      setModalError('Rollenbezeichnung darf nicht leer sein.')
      return
    }

    const startedYear = form.startedYear ? Number(form.startedYear) : null
    const endedYear = form.endedYear ? Number(form.endedYear) : null

    if (startedYear !== null && endedYear !== null && endedYear < startedYear) {
      setModalError('Bis-Jahr darf nicht vor dem Von-Jahr liegen.')
      return
    }

    try {
      setSaving(true)
      setModalError(null)

      if (editTarget) {
        await updateMemberRole(fansubId, editTarget.id, {
          role_code: form.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: form.note.trim() || null,
          status: form.status,
          visibility: 'internal',
        })
      } else {
        const body: CreateMemberRoleRequest = {
          hist_fansub_group_member_id: Number(form.memberId),
          role_code: form.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: form.note.trim() || null,
          status: form.status,
          visibility: 'internal',
        }
        await createMemberRole(fansubId, body)
      }

      await load()
      closeModal()
    } catch (err) {
      setModalError(formatApiError(err, 'Rolle konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError(null)
      await deleteMemberRole(fansubId, deleteTarget.id)
      await load()
      closeDeleteModal()
    } catch (err) {
      setDeleteError(formatApiError(err, 'Rolle konnte nicht gelöscht werden.'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card
      variant="section"
      className={styles.fansubEditMembershipSurface}
      header={(
        <SectionHeader
          eyebrow="Gruppenhistorie"
          title="Historische Rollen"
          description="Dokumentiere, welche Rolle ein Mitglied in der Geschichte dieser Gruppe hatte. Diese Einträge vergeben keine App-Rechte."
          actions={(
            <Toolbar>
              <Button
                variant="primary"
                leftIcon={<Plus size={15} aria-hidden="true" />}
                onClick={openNew}
              >
                Rolle hinzufügen
              </Button>
            </Toolbar>
          )}
        />
      )}
    >
      {error ? (
        <ErrorState
          title="Rollen konnten nicht geladen werden"
          description={error}
          action={<Button variant="secondary" onClick={() => void load()}>Erneut laden</Button>}
        />
      ) : null}
      {loading ? (
        <LoadingState
          title="Rollen werden geladen"
          description="Die Timeline der Gruppenmitglieder wird vorbereitet."
        />
      ) : null}

      {!loading && !error && roles.length === 0 ? (
        <EmptyState
          title="Noch keine Rolleneinträge vorhanden"
          description="Füge den ersten Rolleneintrag hinzu, um die Timeline aufzubauen."
          action={<Button variant="primary" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={openNew}>Rolle hinzufügen</Button>}
          variant="withAction"
        />
      ) : null}

      {!loading && roles.length > 0 ? (
        <div className={styles.fansubEditMembershipList}>
          {roles.map((role) => (
            <Card key={role.id} variant="nestedFlat" className={styles.fansubEditMembershipCard}>
              <div className={styles.fansubEditMembershipCardTop}>
                <div className={styles.fansubEditMembershipIdentity}>
                  <strong>{role.member_display_name}</strong>
                  <span className={styles.fansubEditHint}>
                    {formatZeitraum(role)} · {role.role_label ?? roleLabelForCode(role.role_code)}
                  </span>
                  {role.note ? (
                    <span className={styles.fansubEditHint}>{role.note}</span>
                  ) : null}
                </div>
                <div className={styles.fansubEditMembershipControls}>
                  <Badge variant={statusBadgeVariant(role.status)}>
                    {statusLabel(role.status)}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    leftIcon={<Pencil size={14} aria-hidden="true" />}
                    aria-label={`Rolle von ${role.member_display_name} bearbeiten`}
                    onClick={() => openEdit(role)}
                  />
                  <Button
                    variant="danger"
                    size="sm"
                    iconOnly
                    leftIcon={<Trash2 size={14} aria-hidden="true" />}
                    aria-label={`Rolle von ${role.member_display_name} löschen`}
                    onClick={() => openDelete(role)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Rolle bearbeiten' : 'Rolle hinzufügen'}
        description="Historische Gruppenrolle für ein Mitglied anlegen oder bearbeiten."
        footer={(
          <>
            <Button variant="secondary" onClick={closeModal}>Abbrechen</Button>
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              loading={saving}
              disabled={!form.memberId || !form.roleCode.trim()}
            >
              Speichern
            </Button>
          </>
        )}
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {modalError ? (
            <ErrorState title="Rolle konnte nicht gespeichert werden" description={modalError} />
          ) : null}

          <FormField label="Mitglied" htmlFor="member-role-member" required disabled={!!editTarget}>
            <Select
              id="member-role-member"
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              aria-label="Mitglied auswählen"
              disabled={!!editTarget}
            >
              <option value="">– Mitglied wählen –</option>
              {members.map((m) => (
                <option key={m.id} value={String(m.id)}>{m.display_name}</option>
              ))}
            </Select>
          </FormField>

          <FormField label="Rolle" htmlFor="member-role-role" required>
            <Select
              id="member-role-role"
              value={form.roleCode}
              onChange={(e) => setForm((f) => ({ ...f, roleCode: e.target.value }))}
              aria-label="Rolle auswählen"
            >
              <option value="">Rolle auswählen…</option>
              {GROUP_HISTORY_ROLE_OPTIONS.map((opt) => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </Select>
          </FormField>

          <div className={styles.fansubEditModalGrid}>
            <FormField label="Von-Jahr" htmlFor="member-role-started-year">
              <YearPicker
                id="member-role-started-year"
                label="Von-Jahr"
                value={form.startedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setForm((f) => ({ ...f, startedYear: year }))}
              />
            </FormField>
            <FormField label="Bis-Jahr" htmlFor="member-role-ended-year">
              <YearPicker
                id="member-role-ended-year"
                label="Bis-Jahr"
                value={form.endedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setForm((f) => ({ ...f, endedYear: year }))}
              />
            </FormField>
          </div>

          <FormField label="Notiz" htmlFor="member-role-note" hint="Optionaler Kontext für spätere Prüfung oder Einordnung.">
            <Textarea
              id="member-role-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Ergänzende Anmerkung"
              aria-label="Notiz"
              rows={3}
            />
          </FormField>

          <FormField label="Status" htmlFor="member-role-status" hint={statusHelpText(form.status)}>
            <Select
              id="member-role-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as 'historical' | 'confirmed' }))}
              aria-label="Status"
            >
              <option value="historical">Historisch</option>
              <option value="confirmed">Bestätigt</option>
            </Select>
          </FormField>
        </div>
      </Modal>
      <Modal
        open={deleteTarget != null}
        onClose={closeDeleteModal}
        title="Rolleneintrag löschen"
        description="Diese Änderung entfernt den historischen Rolleneintrag aus der Gruppenhistorie."
        footer={(
          <>
            <Button variant="secondary" onClick={closeDeleteModal}>Abbrechen</Button>
            <Button variant="danger" onClick={() => void handleDelete()} loading={deleting}>
              Löschen
            </Button>
          </>
        )}
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {deleteError ? (
            <ErrorState title="Rolle konnte nicht gelöscht werden" description={deleteError} />
          ) : null}
          {deleteTarget ? (
            <p className={styles.fansubEditMembershipDeleteText}>
              Möchtest du die Rolle <strong>{deleteTarget.role_label ?? roleLabelForCode(deleteTarget.role_code)}</strong> von {deleteTarget.member_display_name} wirklich löschen?
            </p>
          ) : null}
        </div>
      </Modal>
    </Card>
  )
}
