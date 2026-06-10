'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  FormField,
  Input,
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
  createGroupMember,
  createMemberRole,
  deleteGroupMember,
  deleteMemberRole,
  listGroupMembers,
  listMemberRoles,
  updateGroupMember,
  updateMemberRole,
} from '@/lib/api'
import {
  FANSUB_GROUP_ROLE_OPTIONS,
  type CreateGroupMemberRequest,
  type CreateMemberRoleRequest,
  type HistFansubGroupMember,
  type HistGroupMemberRole,
  type HistoricalContributionStatus,
  type HistoricalContributionVisibility,
} from '@/types/fansub'

import sharedStyles from '../../../admin.module.css'
import fansubEditStyles from './FansubEdit.module.css'

const styles = { ...sharedStyles, ...fansubEditStyles }

type GroupMembersTabProps = {
  fansubId: number
}

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_MIN = 1980

function formatApiError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message
  return fallback
}

function formatZeitraum(member: HistFansubGroupMember): string {
  const von = member.joined_year ?? '?'
  const bis = member.left_year ?? 'aktiv'
  return `${von} – ${bis}`
}

function formatConfirmationDate(value?: string | null): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat('de-DE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusBadgeVariant(status: HistFansubGroupMember['status']): 'success' | 'warning' | 'info' | 'muted' {
  if (status === 'confirmed') return 'success'
  if (status === 'disputed') return 'warning'
  if (status === 'draft') return 'muted'
  return 'info'
}

function statusLabel(status: HistFansubGroupMember['status']): string {
  if (status === 'confirmed') return 'Bestätigt'
  if (status === 'disputed') return 'Klärfall'
  if (status === 'draft') return 'Entwurf'
  return 'Historischer Eintrag'
}

function visibilityBadgeVariant(visibility: HistoricalContributionVisibility): 'success' | 'muted' {
  return visibility === 'public' ? 'success' : 'muted'
}

function visibilityLabel(visibility: HistoricalContributionVisibility): string {
  return visibility === 'public' ? 'öffentlich' : 'intern'
}

function memberAssignmentLabel(member: HistFansubGroupMember): string {
  if (member.app_username) return `Zugeordnet: ${member.app_username}`
  return 'Noch keinem aktuellen Gruppenmitglied zugeordnet'
}

function confirmationLabel(member: HistFansubGroupMember): string | null {
  if (member.status !== 'confirmed') return null

  const confirmedBy = member.confirmed_by_display_name?.trim()
  const confirmedAt = formatConfirmationDate(member.confirmed_at)

  if (confirmedBy && confirmedAt) return `Bestätigt von ${confirmedBy} am ${confirmedAt}`
  if (confirmedBy) return `Bestätigt von ${confirmedBy}`
  if (confirmedAt) return `Bestätigt am ${confirmedAt}`
  return 'Bestätigt, Details noch nicht gespeichert'
}

function statusHelpText(status: HistoricalContributionStatus): string {
  if (status === 'draft') {
    return 'Entwurf: Arbeitsstand. Nutze das, wenn Name, Jahre oder Zugehörigkeit noch nicht sauber eingeordnet sind.'
  }
  if (status === 'confirmed') {
    return 'Bestätigt: Beim Speichern wird der aktuelle App-User mit Zeitpunkt als Bestätigung hinterlegt. Das verknüpft noch kein aktuelles Gruppenmitglied.'
  }
  if (status === 'disputed') {
    return 'Klärfall: Nutze das, wenn Angaben widersprüchlich sind, jemand widerspricht oder Rollen/Jahre erst geprüft werden müssen.'
  }
  return 'Historischer Eintrag: Standard für frühere Mitglieder, die grundsätzlich zur Gruppenhistorie gehören, aber noch nicht final bestätigt sind.'
}

function formatRoleZeitraum(role: HistGroupMemberRole): string {
  const von = role.started_year ?? '?'
  const bis = role.ended_year ?? 'heute'
  return `${von} – ${bis}`
}

function roleStatusBadgeVariant(status: HistGroupMemberRole['status']): 'success' | 'info' {
  return status === 'confirmed' ? 'success' : 'info'
}

function roleStatusLabel(status: HistGroupMemberRole['status']): string {
  return status === 'confirmed' ? 'Bestätigt' : 'Historisch'
}

function roleLabelForCode(code: string): string {
  return FANSUB_GROUP_ROLE_OPTIONS.find((option) => option.code === code)?.label ?? code
}

function roleStatusHelpText(status: RoleFormFields['status']): string {
  if (status === 'confirmed') {
    return 'Bestätigt: Diese Rolle ist für die Gruppenhistorie geprüft.'
  }
  return 'Historisch: Der Rolleneintrag gehört zur Timeline, ist aber noch nicht final bestätigt.'
}

type FormFields = {
  displayName: string
  joinedYear: string
  leftYear: string
  status: HistoricalContributionStatus
  visibility: HistoricalContributionVisibility
}

type RoleFormFields = {
  memberId: string
  roleCode: string
  startedYear: string
  endedYear: string
  note: string
  status: 'historical' | 'confirmed'
}

const EMPTY_FORM: FormFields = {
  displayName: '',
  joinedYear: '',
  leftYear: '',
  status: 'historical',
  visibility: 'internal',
}

const EMPTY_ROLE_FORM: RoleFormFields = {
  memberId: '',
  roleCode: '',
  startedYear: '',
  endedYear: '',
  note: '',
  status: 'historical',
}

function memberToForm(m: HistFansubGroupMember): FormFields {
  return {
    displayName: m.display_name,
    joinedYear: m.joined_year != null ? String(m.joined_year) : '',
    leftYear: m.left_year != null ? String(m.left_year) : '',
    status: m.status,
    visibility: m.visibility ?? 'internal',
  }
}

function roleToForm(role: HistGroupMemberRole): RoleFormFields {
  return {
    memberId: String(role.fansub_group_member_id),
    roleCode: role.role_code,
    startedYear: role.started_year != null ? String(role.started_year) : '',
    endedYear: role.ended_year != null ? String(role.ended_year) : '',
    note: role.note ?? '',
    status: role.status,
  }
}

export function GroupMembersTab({ fansubId }: GroupMembersTabProps) {
  const [members, setMembers] = useState<HistFansubGroupMember[]>([])
  const [roles, setRoles] = useState<HistGroupMemberRole[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<HistFansubGroupMember | null>(null)
  const [form, setForm] = useState<FormFields>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<HistFansubGroupMember | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [roleEditTarget, setRoleEditTarget] = useState<HistGroupMemberRole | null>(null)
  const [roleForm, setRoleForm] = useState<RoleFormFields>(EMPTY_ROLE_FORM)
  const [roleSaving, setRoleSaving] = useState(false)
  const [roleModalError, setRoleModalError] = useState<string | null>(null)
  const [roleDeleteTarget, setRoleDeleteTarget] = useState<HistGroupMemberRole | null>(null)
  const [roleDeleting, setRoleDeleting] = useState(false)
  const [roleDeleteError, setRoleDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listGroupMembers(fansubId)
      const loadedMembers = response.data ?? []
      const roleResponses = await Promise.all(
        loadedMembers.map((member) => listMemberRoles(fansubId, member.id)),
      )
      const loadedRoles = roleResponses.flatMap((roleResponse, index) =>
        (roleResponse.data ?? []).map((role) => ({
          ...role,
          member_display_name:
            role.member_display_name || loadedMembers[index]?.display_name || '',
        })),
      )
      setMembers(loadedMembers)
      setRoles(
        loadedRoles.sort((a, b) => {
          const startedDiff = (b.started_year ?? 0) - (a.started_year ?? 0)
          return startedDiff !== 0 ? startedDiff : a.id - b.id
        }),
      )
    } catch (err) {
      setError(formatApiError(err, 'Mitglieder und Rollen konnten nicht geladen werden.'))
    } finally {
      setLoading(false)
    }
  }, [fansubId])

  useEffect(() => {
    void load()
  }, [load])

  const rolesByMember = useMemo(() => {
    const grouped = new Map<number, HistGroupMemberRole[]>()
    for (const role of roles) {
      const list = grouped.get(role.fansub_group_member_id) ?? []
      list.push(role)
      grouped.set(role.fansub_group_member_id, list)
    }
    return grouped
  }, [roles])

  function openNew() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setModalError(null)
    setModalOpen(true)
  }

  function openEdit(member: HistFansubGroupMember) {
    setEditTarget(member)
    setForm(memberToForm(member))
    setModalError(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditTarget(null)
    setModalError(null)
  }

  async function handleSave() {
    if (!form.displayName.trim()) {
      setModalError('Anzeigename darf nicht leer sein.')
      return
    }

    const joinedYear = form.joinedYear ? Number(form.joinedYear) : null
    const leftYear = form.leftYear ? Number(form.leftYear) : null

    if (joinedYear !== null && leftYear !== null && leftYear < joinedYear) {
      setModalError('Austrittsjahr darf nicht vor dem Beitrittsjahr liegen.')
      return
    }

    try {
      setSaving(true)
      setModalError(null)

      if (editTarget) {
        await updateGroupMember(fansubId, editTarget.id, {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          status: form.status,
          visibility: form.visibility,
        })
      } else {
        const body: CreateGroupMemberRequest = {
          display_name: form.displayName.trim(),
          joined_year: joinedYear,
          left_year: leftYear,
          status: form.status,
          visibility: form.visibility,
        }
        await createGroupMember(fansubId, body)
      }

      await load()
      closeModal()
    } catch (err) {
      setModalError(formatApiError(err, 'Mitglied konnte nicht gespeichert werden.'))
    } finally {
      setSaving(false)
    }
  }

  function closeDeleteModal() {
    setDeleteTarget(null)
    setDeleteError(null)
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    try {
      setDeleting(true)
      setDeleteError(null)
      await deleteGroupMember(fansubId, deleteTarget.id)
      await load()
      closeDeleteModal()
    } catch (err) {
      setDeleteError(formatApiError(err, 'Mitglied konnte nicht gelöscht werden.'))
    } finally {
      setDeleting(false)
    }
  }

  function openNewRole(member?: HistFansubGroupMember) {
    setRoleEditTarget(null)
    setRoleForm({
      ...EMPTY_ROLE_FORM,
      memberId: member ? String(member.id) : '',
    })
    setRoleModalError(null)
    setRoleModalOpen(true)
  }

  function openEditRole(role: HistGroupMemberRole) {
    setRoleEditTarget(role)
    setRoleForm(roleToForm(role))
    setRoleModalError(null)
    setRoleModalOpen(true)
  }

  function closeRoleModal() {
    setRoleModalOpen(false)
    setRoleEditTarget(null)
    setRoleModalError(null)
  }

  function closeRoleDeleteModal() {
    setRoleDeleteTarget(null)
    setRoleDeleteError(null)
  }

  async function handleRoleSave() {
    if (!roleForm.memberId) {
      setRoleModalError('Bitte ein Mitglied auswählen.')
      return
    }
    if (!roleForm.roleCode.trim()) {
      setRoleModalError('Rollenbezeichnung darf nicht leer sein.')
      return
    }

    const startedYear = roleForm.startedYear ? Number(roleForm.startedYear) : null
    const endedYear = roleForm.endedYear ? Number(roleForm.endedYear) : null

    if (startedYear !== null && endedYear !== null && endedYear < startedYear) {
      setRoleModalError('Rolle bis darf nicht vor Rolle von liegen.')
      return
    }

    try {
      setRoleSaving(true)
      setRoleModalError(null)

      if (roleEditTarget) {
        await updateMemberRole(fansubId, roleEditTarget.id, {
          role_code: roleForm.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: roleForm.note.trim() || null,
          status: roleForm.status,
          visibility: 'internal',
        })
      } else {
        const body: CreateMemberRoleRequest = {
          hist_fansub_group_member_id: Number(roleForm.memberId),
          role_code: roleForm.roleCode.trim(),
          started_year: startedYear,
          ended_year: endedYear,
          source_note: roleForm.note.trim() || null,
          status: roleForm.status,
          visibility: 'internal',
        }
        await createMemberRole(fansubId, body)
      }

      await load()
      closeRoleModal()
    } catch (err) {
      setRoleModalError(formatApiError(err, 'Rolle konnte nicht gespeichert werden.'))
    } finally {
      setRoleSaving(false)
    }
  }

  async function handleRoleDeleteConfirm() {
    if (!roleDeleteTarget) return
    try {
      setRoleDeleting(true)
      setRoleDeleteError(null)
      await deleteMemberRole(fansubId, roleDeleteTarget.id)
      await load()
      closeRoleDeleteModal()
    } catch (err) {
      setRoleDeleteError(formatApiError(err, 'Rolle konnte nicht gelöscht werden.'))
    } finally {
      setRoleDeleting(false)
    }
  }

  return (
    <Card variant="section" className={styles.fansubEditMembershipSurface}>
      <SectionHeader
        eyebrow="Historische Mitglieder"
        title="Gruppenmitglieder"
        description="Pflege historische Mitglieder und ihre damaligen Gruppenrollen an einer Stelle."
        actions={
          <Toolbar
            leading={
              <>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={openNew}
                >
                  Mitglied hinzufügen
                </Button>
                <Button
                  variant="secondary"
                  leftIcon={<Plus size={15} aria-hidden="true" />}
                  onClick={() => openNewRole()}
                  disabled={members.length === 0}
                >
                  Rolle hinzufügen
                </Button>
              </>
            }
          />
        }
      />

      {error ? (
        <ErrorState
          title="Mitglieder konnten nicht geladen werden"
          description={error}
          action={<Button variant="secondary" size="sm" onClick={() => void load()}>Erneut laden</Button>}
        />
      ) : null}
      {loading ? (
        <LoadingState
          title="Mitglieder werden geladen"
          description="Team4s lädt die historischen Gruppenmitglieder und Rollen."
        />
      ) : null}

      {!loading && !error && members.length === 0 ? (
        <EmptyState
          title="Noch keine Mitglieder eingetragen"
          description="Füge das erste historische Mitglied hinzu. Danach kannst du direkt Rollen an dieser Person pflegen."
          action={<Button variant="primary" leftIcon={<Plus size={15} aria-hidden="true" />} onClick={openNew}>Mitglied hinzufügen</Button>}
        />
      ) : null}

      {!loading && members.length > 0 ? (
        <div className={styles.fansubEditMembershipList}>
          {members.map((member) => {
            const confirmation = confirmationLabel(member)
            const memberRoles = rolesByMember.get(member.id) ?? []

            return (
              <Card key={member.id} variant="nestedFlat" className={styles.fansubEditMembershipCard}>
                <div className={styles.fansubEditMembershipCardTop}>
                  <div className={styles.fansubEditMembershipIdentity}>
                    <strong>{member.display_name}</strong>
                    <div className={styles.fansubEditMembershipMetaLine}>
                      <span>{formatZeitraum(member)}</span>
                      <span>{memberAssignmentLabel(member)}</span>
                      {confirmation ? <span>{confirmation}</span> : null}
                    </div>
                  </div>
                  <div className={styles.fansubEditMembershipControls}>
                    <Badge variant={statusBadgeVariant(member.status)}>
                      {statusLabel(member.status)}
                    </Badge>
                    <Badge
                      variant={visibilityBadgeVariant(member.visibility ?? 'internal')}
                      className={styles.fansubEditMembershipVisibilityBadge}
                    >
                      {visibilityLabel(member.visibility ?? 'internal')}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      aria-label="Mitglied bearbeiten"
                      leftIcon={<Pencil size={14} aria-hidden="true" />}
                      onClick={() => openEdit(member)}
                    />
                    <Button
                      variant="danger"
                      size="sm"
                      iconOnly
                      aria-label="Mitglied löschen"
                      leftIcon={<Trash2 size={14} aria-hidden="true" />}
                      onClick={() => setDeleteTarget(member)}
                    />
                  </div>
                </div>
                <div className={styles.fansubEditMembershipBody}>
                  <div className={styles.fansubEditMembershipRoleSummary}>
                    <span>Historische Rollen</span>
                    {memberRoles.length > 0 ? (
                      <div className={styles.fansubEditMembershipRoleList}>
                        {memberRoles.map((role) => (
                          <div key={role.id} className={styles.fansubEditMembershipRoleItem}>
                            <div className={styles.fansubEditMembershipRoleItemMain}>
                              <strong>{role.role_label ?? roleLabelForCode(role.role_code)}</strong>
                              <span>{formatRoleZeitraum(role)}</span>
                              {role.note ? <span>{role.note}</span> : null}
                            </div>
                            <div className={styles.fansubEditMembershipRoleControls}>
                              <Badge variant={roleStatusBadgeVariant(role.status)}>
                                {roleStatusLabel(role.status)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                iconOnly
                                aria-label="Rolle bearbeiten"
                                leftIcon={<Pencil size={14} aria-hidden="true" />}
                                onClick={() => openEditRole(role)}
                              />
                              <Button
                                variant="danger"
                                size="sm"
                                iconOnly
                                aria-label="Rolle löschen"
                                leftIcon={<Trash2 size={14} aria-hidden="true" />}
                                onClick={() => setRoleDeleteTarget(role)}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.fansubEditHint}>Noch keine historische Rolle eingetragen.</p>
                    )}
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<Plus size={14} aria-hidden="true" />}
                    onClick={() => openNewRole(member)}
                  >
                    Rolle hinzufügen
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      ) : null}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editTarget ? 'Mitglied bearbeiten' : 'Mitglied hinzufügen'}
        description="Historisches Mitglied der Fansubgruppe anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              Schließen
            </Button>
            <Button
              variant="success"
              loading={saving}
              onClick={() => void handleSave()}
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
            <FormField label="Beitrittsjahr" htmlFor="hist-member-joined-year" hint="Optionaler Startpunkt der Mitgliedschaft.">
              <YearPicker
                id="hist-member-joined-year"
                label="Beitrittsjahr"
                value={form.joinedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(value) => setForm((f) => ({ ...f, joinedYear: value }))}
              />
            </FormField>

            <FormField label="Austrittsjahr" htmlFor="hist-member-left-year" hint="Leer lassen, wenn die Person weiterhin aktiv ist.">
              <YearPicker
                id="hist-member-left-year"
                label="Austrittsjahr"
                value={form.leftYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(value) => setForm((f) => ({ ...f, leftYear: value }))}
              />
            </FormField>
          </div>

          <div className={styles.fansubEditMembershipModalGrid}>
            <FormField
              label="Status"
              htmlFor="hist-member-status"
              hint={statusHelpText(form.status)}
            >
              <Select
                id="hist-member-status"
                value={form.status}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  status: e.target.value as HistoricalContributionStatus,
                }))}
              >
                <option value="historical">Historischer Eintrag</option>
                <option value="confirmed">Bestätigt</option>
                <option value="draft">Entwurf</option>
                <option value="disputed">Klärfall</option>
              </Select>
            </FormField>

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
        </div>
      </Modal>

      <Modal
        open={roleModalOpen}
        onClose={closeRoleModal}
        title={roleEditTarget ? 'Rolle bearbeiten' : 'Rolle hinzufügen'}
        description="Historische Gruppenrolle für ein Mitglied anlegen oder bearbeiten."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeRoleModal} disabled={roleSaving}>
              Schließen
            </Button>
            <Button
              variant="success"
              loading={roleSaving}
              onClick={() => void handleRoleSave()}
              disabled={!roleForm.memberId || !roleForm.roleCode.trim()}
            >
              Speichern
            </Button>
          </div>
        }
      >
        <div className={styles.fansubEditMembershipModalStack}>
          {roleModalError ? (
            <ErrorState
              title="Rolle konnte nicht gespeichert werden"
              description={roleModalError}
            />
          ) : null}

          <FormField label="Mitglied" htmlFor="member-role-member" required disabled={!!roleEditTarget}>
            <Select
              id="member-role-member"
              value={roleForm.memberId}
              onChange={(e) => setRoleForm((f) => ({ ...f, memberId: e.target.value }))}
              aria-label="Mitglied auswählen"
              disabled={!!roleEditTarget}
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
              {FANSUB_GROUP_ROLE_OPTIONS.map((option) => (
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
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
                onChange={(year) => setRoleForm((f) => ({ ...f, startedYear: year }))}
              />
            </FormField>
            <FormField label="Rolle bis" htmlFor="member-role-ended-year">
              <YearPicker
                id="member-role-ended-year"
                label="Rolle bis"
                value={roleForm.endedYear}
                minYear={YEAR_MIN}
                maxYear={CURRENT_YEAR}
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

          <FormField label="Status" htmlFor="member-role-status" hint={roleStatusHelpText(roleForm.status)}>
            <Select
              id="member-role-status"
              value={roleForm.status}
              onChange={(e) => setRoleForm((f) => ({
                ...f,
                status: e.target.value as RoleFormFields['status'],
              }))}
              aria-label="Status"
            >
              <option value="historical">Historisch</option>
              <option value="confirmed">Bestätigt</option>
            </Select>
          </FormField>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={closeDeleteModal}
        title="Mitglied löschen"
        description="Dieses historische Mitglied wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeDeleteModal} disabled={deleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={deleting}
              onClick={() => void handleDeleteConfirm()}
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
        onClose={closeRoleDeleteModal}
        title="Rolleneintrag löschen"
        description="Diese Änderung entfernt den historischen Rolleneintrag aus der Gruppenhistorie."
        footer={
          <div className={styles.fansubEditMembershipModalActions}>
            <Button variant="secondary" onClick={closeRoleDeleteModal} disabled={roleDeleting}>
              Nicht löschen
            </Button>
            <Button
              variant="danger"
              loading={roleDeleting}
              onClick={() => void handleRoleDeleteConfirm()}
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
    </Card>
  )
}
